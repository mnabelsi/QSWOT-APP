import { useState } from 'react';
import { motion } from 'framer-motion';
import { useKAMStore } from '../hooks/useKAMStore';
import { parseCurrencyInput } from '../lib/currency';
import type { AccountType } from '../types';

const FALLBACK_ACCOUNT_TYPES = ['enterprise', 'organization', 'clinic', 'distributor', 'partner', 'other'];

export default function AccountForm({ onClose }: { onClose: () => void }) {
  const { addAccount, templates } = useKAMStore();
  const activeTemplate = templates.find(t => t.isActive);
  const typeOptions = activeTemplate?.accountTypes?.length
    ? activeTemplate.accountTypes
    : FALLBACK_ACCOUNT_TYPES;

  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [type, setType] = useState<AccountType>(typeOptions[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !size) return;
    const parsed = parseCurrencyInput(size);
    if (parsed === null || parsed < 0) return;
    addAccount({ name: name.trim(), size: parsed, type });
    setName('');
    setSize('');
    setType(typeOptions[0]);
    onClose();
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    fontSize: 14,
    background: 'var(--color-bg)',
    width: '100%',
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 20,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px auto', gap: 10, alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
            Account name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. CHU Regional"
            style={inputStyle}
            autoFocus
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
            Size (€)
          </label>
          <input
            type="text"
            value={size}
            onChange={e => setSize(e.target.value)}
            placeholder="e.g. 450k, 1.5m, 500000"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
            Type
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value as AccountType)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {typeOptions.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="submit"
            disabled={!name.trim() || !size}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: '#fff', background: name.trim() && size ? 'var(--color-interactive)' : '#ccc',
              border: 'none', cursor: name.trim() && size ? 'pointer' : 'not-allowed',
              transition: 'all 150ms ease-out',
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              color: 'var(--color-text-secondary)', background: 'var(--color-bg)',
              border: '1px solid var(--color-border)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.form>
  );
}
