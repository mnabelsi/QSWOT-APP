import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ClaudeConfig } from '../lib/claude';

const STORAGE_KEY = 'kam-claude-config';

const DEFAULT: ClaudeConfig = {
  apiKey: '',
  model: 'claude-sonnet-4-6',
};

function readStorage(): ClaudeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT;
}

interface ClaudeConfigState {
  config: ClaudeConfig;
  update: (patch: Partial<ClaudeConfig>) => void;
  isConfigured: boolean;
}

const ClaudeConfigContext = createContext<ClaudeConfigState | null>(null);

export function ClaudeConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ClaudeConfig>(readStorage);

  const update = useCallback((patch: Partial<ClaudeConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <ClaudeConfigContext.Provider value={{ config, update, isConfigured: Boolean(config.apiKey.trim()) }}>
      {children}
    </ClaudeConfigContext.Provider>
  );
}

export function useClaudeConfig(): ClaudeConfigState {
  const ctx = useContext(ClaudeConfigContext);
  if (!ctx) throw new Error('useClaudeConfig must be used within ClaudeConfigProvider');
  return ctx;
}
