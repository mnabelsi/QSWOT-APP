import { useState } from 'react';
import { useKAMStore } from '../hooks/useKAMStore';
import AccountDetailModal from './AccountDetailModal';
import AccountsTable from './AccountsTable';

export default function AccountsScreen() {
  const { accounts, loadSampleAccounts } = useKAMStore();
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>Accounts Base</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Manage {accounts.length} account{accounts.length !== 1 ? 's' : ''} in your portfolio
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 16px', borderRadius: 8,
            fontSize: 12, fontWeight: 600,
            color: '#ffffff', background: 'var(--color-interactive)',
            border: 'none', cursor: 'pointer',
            transition: 'all 150ms ease-out',
          }}
        >
          + Add account
        </button>
      </div>

      <AccountDetailModal 
        account={null} 
        open={showForm} 
        onClose={() => setShowForm(false)} 
      />

      {accounts.length === 0 && !showForm ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '48px 20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(108,92,231,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 22,
          }}>
            📊
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            No accounts yet
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 20, maxWidth: 300, margin: '0 auto 20px' }}>
            Add your first account to start scoring and visualizing your portfolio on the matrix.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '9px 18px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                color: '#ffffff', background: 'var(--color-interactive)',
                border: 'none', cursor: 'pointer',
              }}
            >
              + Add your first account
            </button>
            <button
              onClick={loadSampleAccounts}
              style={{
                padding: '9px 18px', borderRadius: 8,
                fontSize: 12, fontWeight: 500,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              Load 10 sample accounts
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AccountsTable onEdit={() => setShowForm(true)} />
        </div>
      )}
    </div>
  );
}
