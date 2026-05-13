import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type { Template, Account, Scores, EnrichedAccount, Screen, AccountType } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { defaultTemplate } from '../data/defaultTemplate';
import { sampleAccounts } from '../data/sampleAccounts';
import { enrichAccount } from '../lib/scoring';
import { generateId } from '../lib/ids';

interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface KAMState {
  templates: Template[];
  accounts: Account[];
  scores: Scores;
  activeScreen: Screen;
  selectedAccountId: string | null;
  toasts: ToastMessage[];
  enrichedAccounts: EnrichedAccount[];
  activeTemplate: Template;
  setActiveScreen: (screen: Screen) => void;
  setSelectedAccountId: (id: string | null) => void;
  addAccount: (data: Partial<Account> & { name: string; size: number; type: AccountType }) => string;
  deleteAccount: (id: string) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  loadSampleAccounts: () => void;
  setScore: (accountId: string, criterionId: string, score: number) => void;
  addTemplate: (template: Template) => void;
  updateTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  setActiveTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  resetAllData: () => void;
  addToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  dismissToast: (id: string) => void;
}

const KAMContext = createContext<KAMState | null>(null);

export function KAMProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useLocalStorage<Template[]>('kam-templates', [defaultTemplate]);
  const [accounts, setAccounts] = useLocalStorage<Account[]>('kam-accounts', []);
  const [scores, setScores] = useLocalStorage<Scores>('kam-scores', {});
  const [activeScreen, setActiveScreen] = React.useState<Screen>('portfolio');
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const activeTemplate = useMemo(
    () => templates.find(t => t.isActive) || templates[0] || defaultTemplate,
    [templates]
  );

  const enrichedAccounts = useMemo(
    () => accounts
      .filter(a => !a.templateId || a.templateId === activeTemplate.id)
      .map(a => enrichAccount(a, activeTemplate, scores)),
    [accounts, activeTemplate, scores]
  );

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addAccount = useCallback((data: Partial<Account> & { name: string; size: number; type: AccountType }): string => {
    const id = generateId();
    const newAccount: Account = {
      id,
      templateId: activeTemplate.id,
      createdAt: new Date().toISOString(),
      ...data,
    };
    setAccounts(prev => [...prev, newAccount]);
    return id;
  }, [setAccounts, activeTemplate.id]);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setScores(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedAccountId === id) {
      setSelectedAccountId(null);
    }
  }, [setAccounts, setScores, selectedAccountId]);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, [setAccounts]);

  const loadSampleAccounts = useCallback(() => {
    const newAccounts: Account[] = sampleAccounts.map(sa => ({
      ...sa,
      id: generateId(),
      templateId: activeTemplate.id,
      createdAt: new Date().toISOString(),
    }));
    setAccounts(prev => [...prev, ...newAccounts]);
    addToast('Loaded 10 sample accounts', 'success');
  }, [setAccounts, addToast, activeTemplate.id]);

  const setScore = useCallback((accountId: string, criterionId: string, score: number) => {
    // Get old enriched data before change
    const oldEnriched = enrichedAccounts.find(a => a.id === accountId);

    setScores(prev => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {}),
        [criterionId]: score,
      },
    }));

    // Update lastScoredAt
    setAccounts(prev => prev.map(a =>
      a.id === accountId ? { ...a, lastScoredAt: new Date().toISOString() } : a
    ));

    // Check for zone change after score update (deferred)
    setTimeout(() => {
      const updatedScores = {
        ...scores,
        [accountId]: {
          ...(scores[accountId] || {}),
          [criterionId]: score,
        },
      };
      const account = accounts.find(a => a.id === accountId);
      if (account && oldEnriched) {
        const newEnriched = enrichAccount(account, activeTemplate, updatedScores);
        if (oldEnriched.zone !== newEnriched.zone) {
          const zoneLabels = { green: 'Green', yellow: 'Yellow', red: 'Red' };
          addToast(`${account.name} moved to ${zoneLabels[newEnriched.zone]} zone`, 'success');
        }
      }
    }, 50);
  }, [setScores, setAccounts, scores, accounts, activeTemplate, enrichedAccounts, addToast]);

  const addTemplate = useCallback((template: Template) => {
    setTemplates(prev => [...prev, template]);
  }, [setTemplates]);

  const updateTemplate = useCallback((template: Template) => {
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
  }, [setTemplates]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, [setTemplates]);

  const setActiveTemplateAction = useCallback((id: string) => {
    setTemplates(prev => prev.map(t => ({ ...t, isActive: t.id === id })));
  }, [setTemplates]);

  const duplicateTemplate = useCallback((id: string) => {
    const source = templates.find(t => t.id === id);
    if (!source) return;
    const newTemplate: Template = {
      ...source,
      id: generateId(),
      name: `${source.name} (Copy)`,
      isActive: false,
      createdAt: new Date().toISOString(),
      attractivenessCriteria: source.attractivenessCriteria.map(c => ({ ...c, id: generateId() })),
      capabilityCriteria: source.capabilityCriteria.map(c => ({ ...c, id: generateId() })),
    };
    setTemplates(prev => [...prev, newTemplate]);
    addToast('Template duplicated', 'success');
  }, [templates, setTemplates, addToast]);

  const resetAllData = useCallback(() => {
    setTemplates([defaultTemplate]);
    setAccounts([]);
    setScores({});
    setSelectedAccountId(null);
    addToast('All data has been reset', 'info');
  }, [setTemplates, setAccounts, setScores, addToast]);

  const value: KAMState = {
    templates,
    accounts,
    scores,
    activeScreen,
    selectedAccountId,
    toasts,
    enrichedAccounts,
    activeTemplate,
    setActiveScreen,
    setSelectedAccountId,
    addAccount,
    deleteAccount,
    updateAccount,
    loadSampleAccounts,
    setScore,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    setActiveTemplate: setActiveTemplateAction,
    duplicateTemplate,
    resetAllData,
    addToast,
    dismissToast,
  };

  return (
    <KAMContext.Provider value={value}>
      {children}
    </KAMContext.Provider>
  );
}

export function useKAMStore(): KAMState {
  const ctx = useContext(KAMContext);
  if (!ctx) throw new Error('useKAMStore must be used within KAMProvider');
  return ctx;
}
