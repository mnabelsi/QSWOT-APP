import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKAMStore } from '../hooks/useKAMStore';
import GuidedScoring from './GuidedScoring';
import OverviewScoring from './OverviewScoring';
import ZoneBadge from './ZoneBadge';
import AccountDetailModal from './AccountDetailModal';
import { formatCurrency, parseCurrencyInput } from '../lib/currency';
import type { ScoringMode } from '../types';

export default function ScoreSlideOver() {
  const { selectedAccountId, setSelectedAccountId, enrichedAccounts, updateAccount } = useKAMStore();
  const [mode, setMode] = useState<ScoringMode>('guided');
  const [editingSize, setEditingSize] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const account = enrichedAccounts.find(a => a.id === selectedAccountId);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAccountId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSelectedAccountId]);

  // Reset mode to guided when opening a new account
  useEffect(() => {
    if (selectedAccountId) {
      setMode('guided');
    }
  }, [selectedAccountId]);

  const typeLabels: Record<string, string> = {
    hospital: 'Hospital',
    clinic: 'Clinic',
    surgical: 'Surgical',
    distributor: 'Distributor',
    other: 'Other',
  };

  return (
    <AnimatePresence>
      {account && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedAccountId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 60,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 480,
              maxWidth: '95vw',
              background: 'var(--color-surface)',
              zIndex: 70,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {account.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)',
                      background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 4,
                    }}>
                      {typeLabels[account.type]}
                    </span>
                    {editingSize ? (
                      <input
                        autoFocus
                        value={sizeInput}
                        onChange={e => setSizeInput(e.target.value)}
                        onBlur={() => {
                          const parsed = parseCurrencyInput(sizeInput);
                          if (parsed !== null && parsed >= 0) {
                            updateAccount(account.id, { size: parsed });
                          }
                          setEditingSize(false);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                          }
                          if (e.key === 'Escape') {
                            setEditingSize(false);
                          }
                        }}
                        placeholder="e.g. 450k, 1.5m"
                        style={{
                          width: 80, padding: '2px 6px', borderRadius: 4,
                          border: '1px solid var(--color-interactive)',
                          fontSize: 13, fontWeight: 600, background: 'var(--color-bg)',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSizeInput(account.size.toString());
                          setEditingSize(true);
                        }}
                        title="Click to edit"
                        style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)',
                          cursor: 'pointer', borderBottom: '1px dashed var(--color-border)',
                          paddingBottom: 1,
                        }}
                      >
                        {formatCurrency(account.size)}
                      </span>
                    )}
                    <ZoneBadge zone={account.zone} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowEditModal(true)}
                    style={{
                      height: 32, padding: '0 12px', borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                      fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setSelectedAccountId(null)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                      fontSize: 16, color: 'var(--color-text-secondary)', cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Score gauges */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                {/* Attractiveness gauge */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-border)" strokeWidth="4" />
                    <motion.circle
                      cx="32" cy="32" r="28" fill="none"
                      stroke="var(--color-accent-coral)" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      animate={{
                        strokeDashoffset: 2 * Math.PI * 28 * (1 - Math.min(Math.max(account.attractivenessScore / 300, 0), 1)),
                      }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      transform="rotate(-90 32 32)"
                    />
                    <text x="32" y="35" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-accent-coral)" fontFamily="var(--font-family-sans)">
                      {account.attractivenessScore.toFixed(0)}
                    </text>
                  </svg>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-accent-coral)', marginTop: 2 }}>
                    Attractiveness
                  </div>
                </div>

                {/* Capability gauge */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-border)" strokeWidth="4" />
                    <motion.circle
                      cx="32" cy="32" r="28" fill="none"
                      stroke="var(--color-accent-blue)" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      animate={{
                        strokeDashoffset: 2 * Math.PI * 28 * (1 - Math.min(Math.max(account.capabilityScore / 300, 0), 1)),
                      }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      transform="rotate(-90 32 32)"
                    />
                    <text x="32" y="35" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-accent-blue)" fontFamily="var(--font-family-sans)">
                      {account.capabilityScore.toFixed(0)}
                    </text>
                  </svg>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-accent-blue)', marginTop: 2 }}>
                    Capability
                  </div>
                </div>
              </div>

              {/* Completion bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                    {account.scoredCount} of {account.totalCriteria} scored
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                    {account.totalCriteria > 0 ? Math.round((account.scoredCount / account.totalCriteria) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: 'var(--color-interactive)', borderRadius: 2 }}
                    animate={{ width: account.totalCriteria > 0 ? `${(account.scoredCount / account.totalCriteria) * 100}%` : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Mode toggle */}
              <div style={{
                display: 'flex', gap: 2, marginTop: 16,
                background: 'var(--color-bg)', borderRadius: 8, padding: 2,
              }}>
                {(['guided', 'overview'] as ScoringMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 6,
                      fontSize: 12, fontWeight: 500,
                      color: mode === m ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                      background: mode === m ? 'var(--color-surface)' : 'transparent',
                      border: mode === m ? '1px solid var(--color-border)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 150ms ease-out',
                      textTransform: 'capitalize',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Scoring content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {mode === 'guided' ? (
                <GuidedScoring accountId={account.id} />
              ) : (
                <OverviewScoring accountId={account.id} />
              )}
            </div>
          </motion.div>

          <AccountDetailModal 
            account={account}
            open={showEditModal}
            onClose={() => setShowEditModal(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
