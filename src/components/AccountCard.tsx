import { useState } from 'react';
import { useKAMStore } from '../hooks/useKAMStore';
import ZoneBadge from './ZoneBadge';
import { isStale } from '../lib/scoring';
import { formatCurrency } from '../lib/currency';
import AccountDetailModal from './AccountDetailModal';

export default function AccountCard({ accountId }: { accountId: string }) {
  const { enrichedAccounts, setSelectedAccountId, deleteAccount } = useKAMStore();
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const account = enrichedAccounts.find(a => a.id === accountId);
  if (!account) return null;

  const stale = isStale(account);
  const completeness = account.totalCriteria > 0
    ? Math.round((account.scoredCount / account.totalCriteria) * 100)
    : 0;

  const typeLabels: Record<string, string> = {
    hospital: 'Hospital', clinic: 'Clinic', surgical: 'Surgical', distributor: 'Distributor', other: 'Other',
  };

  const maxScore = 300;

  return (
    <div
      onClick={() => setSelectedAccountId(account.id)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'all 150ms ease-out',
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#d0cec8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {account.name}
            </h3>
            {stale && (
              <span style={{
                fontSize: 8, fontWeight: 700, color: 'var(--color-zone-amber)',
                background: '#fef3cd', padding: '1px 5px', borderRadius: 3,
                letterSpacing: '0.04em',
              }}>
                STALE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)',
              background: 'var(--color-bg)', padding: '2px 7px', borderRadius: 4,
              letterSpacing: '0.02em',
            }}>
              {typeLabels[account.type]}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {formatCurrency(account.size)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ZoneBadge zone={account.zone} size="small" />
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
              style={{
                width: 22, height: 22, borderRadius: 5, fontSize: 13, lineHeight: '22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-tertiary)', cursor: 'pointer',
                background: 'transparent', border: 'none',
              }}
            >
              ⋯
            </button>
            {showMenu && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', top: '100%', right: 0,
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 8, padding: 4, minWidth: 110,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10,
                }}
              >
                {!confirmDelete ? (
                  <>
                    <button
                      onClick={() => { setShowEditModal(true); setShowMenu(false); }}
                      style={{
                        width: '100%', padding: '5px 10px', borderRadius: 5,
                        fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      Edit account
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        width: '100%', padding: '5px 10px', borderRadius: 5,
                        fontSize: 11, fontWeight: 500, color: 'var(--color-zone-red)',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      Delete account
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '5px 10px' }}>
                    <p style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 5 }}>Are you sure?</p>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => { deleteAccount(account.id); setShowMenu(false); }}
                        style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          color: '#fff', background: 'var(--color-zone-red)',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(false); setShowMenu(false); }}
                        style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                          color: 'var(--color-text-secondary)', background: 'var(--color-bg)',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-accent-coral)', letterSpacing: '0.04em' }}>ATTRACT.</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent-coral)' }}>{account.attractivenessScore.toFixed(0)}</span>
          </div>
          <div style={{ height: 5, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, background: 'var(--color-accent-coral)',
              width: `${Math.max(0, Math.min(100, (account.attractivenessScore / maxScore) * 100))}%`,
              transition: 'width 300ms ease-out',
            }} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-accent-blue)', letterSpacing: '0.04em' }}>CAPABILITY</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent-blue)' }}>{account.capabilityScore.toFixed(0)}</span>
          </div>
          <div style={{ height: 5, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, background: 'var(--color-accent-blue)',
              width: `${Math.max(0, Math.min(100, (account.capabilityScore / maxScore) * 100))}%`,
              transition: 'width 300ms ease-out',
            }} />
          </div>
        </div>
      </div>

      {/* Completion */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 3, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: completeness === 100 ? 'var(--color-zone-green)' : 'var(--color-interactive)',
            width: `${completeness}%`, transition: 'width 300ms ease-out',
          }} />
        </div>
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {account.scoredCount}/{account.totalCriteria}
        </span>
      </div>

      <AccountDetailModal
        account={account}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}
