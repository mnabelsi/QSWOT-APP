import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKAMStore } from '../hooks/useKAMStore';
import { parseCurrencyInput } from '../lib/currency';
import type { Account, AccountType, Ownership, ContractStatus, StrategicPriority } from '../types';

const THERAPEUTIC_AREAS = [
  'Cardiology', 'Oncology', 'Orthopedics', 'Neurology', 'Ophthalmology',
  'Pediatrics', 'General Surgery', 'Vascular Surgery', 'Hematology',
  'Rehabilitation', 'Sports Medicine', 'Emergency', 'Diagnostics',
  'Gastroenterology', 'Urology', 'Dermatology', 'Endocrinology',
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'university_hospital', label: 'University Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'surgical_center', label: 'Surgical Center' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'gpo', label: 'GPO' },
  { value: 'other', label: 'Other' },
];

const TERRITORIES = ['North', 'South', 'East', 'West', 'Central'];

interface AccountDetailModalProps {
  account: Account | null;    // null = create new
  open: boolean;
  onClose: () => void;
}

export default function AccountDetailModal({ account, open, onClose }: AccountDetailModalProps) {
  const { addAccount, updateAccount } = useKAMStore();
  const isNew = account === null;

  const [form, setForm] = useState({
    name: '',
    sizeText: '',
    type: 'hospital' as AccountType,
    territory: '',
    ownership: '' as Ownership | '',
    beds: '',
    therapeuticAreas: [] as string[],
    contactName: '',
    contactRole: '',
    contactEmail: '',
    contactPhone: '',
    contractStatus: 'none' as ContractStatus,
    strategicPriority: 'medium' as StrategicPriority,
    notes: '',
  });

  const [taInput, setTaInput] = useState('');
  const [showTaSuggestions, setShowTaSuggestions] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Initialize form when account changes
  useEffect(() => {
    if (account) {
      setForm({
        name: account.name,
        sizeText: account.size.toString(),
        type: account.type,
        territory: account.territory || '',
        ownership: account.ownership || '',
        beds: account.beds?.toString() || '',
        therapeuticAreas: account.therapeuticAreas || [],
        contactName: account.contact?.name || '',
        contactRole: account.contact?.role || '',
        contactEmail: account.contact?.email || '',
        contactPhone: account.contact?.phone || '',
        contractStatus: account.contractStatus || 'none',
        strategicPriority: account.strategicPriority || 'medium',
        notes: account.notes || '',
      });
    } else {
      setForm({
        name: '', sizeText: '', type: 'hospital', territory: '', ownership: '',
        beds: '', therapeuticAreas: [], contactName: '', contactRole: '',
        contactEmail: '', contactPhone: '', contractStatus: 'none',
        strategicPriority: 'medium', notes: '',
      });
    }
    setTaInput('');
  }, [account, open]);

  useEffect(() => {
    if (open && nameRef.current) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    const parsed = parseCurrencyInput(form.sizeText) || 0;

    const data = {
      name: form.name.trim(),
      size: parsed,
      type: form.type,
      territory: form.territory || undefined,
      ownership: (form.ownership as Ownership) || undefined,
      beds: form.beds ? parseInt(form.beds) : undefined,
      therapeuticAreas: form.therapeuticAreas.length > 0 ? form.therapeuticAreas : undefined,
      contact: form.contactName ? {
        name: form.contactName,
        role: form.contactRole,
        email: form.contactEmail || undefined,
        phone: form.contactPhone || undefined,
      } : undefined,
      contractStatus: form.contractStatus,
      strategicPriority: form.strategicPriority,
      notes: form.notes || undefined,
    };

    if (isNew) {
      addAccount(data);
    } else {
      updateAccount(account!.id, data);
    }
    onClose();
  };

  const addTherapeuticArea = (area: string) => {
    const trimmed = area.trim();
    if (trimmed && !form.therapeuticAreas.includes(trimmed)) {
      setForm(f => ({ ...f, therapeuticAreas: [...f.therapeuticAreas, trimmed] }));
    }
    setTaInput('');
    setShowTaSuggestions(false);
  };

  const removeTherapeuticArea = (area: string) => {
    setForm(f => ({ ...f, therapeuticAreas: f.therapeuticAreas.filter(a => a !== area) }));
  };

  const filteredSuggestions = THERAPEUTIC_AREAS.filter(
    a => a.toLowerCase().includes(taInput.toLowerCase()) && !form.therapeuticAreas.includes(a)
  );

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--color-border)', fontSize: 13,
    background: 'var(--color-bg)', width: '100%',
    outline: 'none', transition: 'border-color 150ms',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)',
    display: 'block', marginBottom: 4, letterSpacing: '0.02em',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 20,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)',
    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    marginBottom: 12, paddingBottom: 6,
    borderBottom: '1px solid var(--color-border)',
  };

  const contractColors: Record<ContractStatus, string> = {
    active: 'var(--color-zone-green)',
    expiring: 'var(--color-zone-amber)',
    expired: 'var(--color-zone-red)',
    prospect: 'var(--color-interactive)',
    none: 'var(--color-text-tertiary)',
  };

  const priorityColors: Record<StrategicPriority, string> = {
    high: 'var(--color-accent-coral)',
    medium: 'var(--color-zone-amber)',
    low: 'var(--color-text-tertiary)',
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.35)', zIndex: 998,
            }}
          />
          {/* Container to center the modal securely, avoiding Framer Motion transform conflicts */}
          <div style={{
            position: 'fixed', inset: 0, zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', padding: 20,
          }}>
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{
                width: 620, maxWidth: '100%',
                maxHeight: '100%',
                background: 'var(--color-surface)',
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px var(--color-border)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                pointerEvents: 'auto',
              }}
            >
            {/* Header */}
            <div style={{
              padding: '18px 24px 14px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {isNew ? 'Add Account' : 'Edit Account'}
              </h2>
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Body — scrollable */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              {/* Essential Info */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Account Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Account Name *</label>
                    <input
                      ref={nameRef}
                      type="text" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. CHU Regional Hospital"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Revenue (€)</label>
                    <input
                      type="text" value={form.sizeText}
                      onChange={e => setForm(f => ({ ...f, sizeText: e.target.value }))}
                      placeholder="e.g. 450k, 1.5m"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Account Type</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value as AccountType }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {ACCOUNT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Territory / Region</label>
                    <select
                      value={form.territory}
                      onChange={e => setForm(f => ({ ...f, territory: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="">Select…</option>
                      {TERRITORIES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Ownership</label>
                    <select
                      value={form.ownership}
                      onChange={e => setForm(f => ({ ...f, ownership: e.target.value as Ownership }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="">Select…</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="mixed">Mixed (PPP)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Number of Beds</label>
                    <input
                      type="number" value={form.beds}
                      onChange={e => setForm(f => ({ ...f, beds: e.target.value }))}
                      placeholder="e.g. 450"
                      style={inputStyle}
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* Therapeutic Areas */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Therapeutic Areas</div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={taInput}
                    onChange={e => { setTaInput(e.target.value); setShowTaSuggestions(true); }}
                    onFocus={() => setShowTaSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowTaSuggestions(false), 150)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (taInput.trim()) addTherapeuticArea(taInput);
                      }
                    }}
                    placeholder="Type to add therapeutic areas…"
                    style={inputStyle}
                  />
                  {showTaSuggestions && taInput && filteredSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 8, padding: 4, marginTop: 2,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10,
                      maxHeight: 160, overflow: 'auto',
                    }}>
                      {filteredSuggestions.map(s => (
                        <button
                          key={s}
                          onMouseDown={() => addTherapeuticArea(s)}
                          style={{
                            width: '100%', padding: '6px 10px', borderRadius: 5,
                            fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)',
                            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {form.therapeuticAreas.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                    {form.therapeuticAreas.map(area => (
                      <span
                        key={area}
                        style={{
                          fontSize: 11, fontWeight: 500, color: 'var(--color-interactive)',
                          background: 'rgba(108,92,231,0.06)', padding: '3px 8px 3px 10px',
                          borderRadius: 5, display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {area}
                        <button
                          onClick={() => removeTherapeuticArea(area)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-text-tertiary)', fontSize: 11, lineHeight: 1,
                            padding: 0,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status & Priority */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Status & Priority</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                  <div>
                    <label style={labelStyle}>Contract Status</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(['active', 'expiring', 'expired', 'prospect', 'none'] as ContractStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setForm(f => ({ ...f, contractStatus: s }))}
                          style={{
                            padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            color: form.contractStatus === s ? '#fff' : contractColors[s],
                            background: form.contractStatus === s ? contractColors[s] : 'var(--color-bg)',
                            border: `1px solid ${form.contractStatus === s ? contractColors[s] : 'var(--color-border)'}`,
                            cursor: 'pointer', textTransform: 'capitalize', transition: 'all 100ms',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Strategic Priority</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['high', 'medium', 'low'] as StrategicPriority[]).map(p => (
                        <button
                          key={p}
                          onClick={() => setForm(f => ({ ...f, strategicPriority: p }))}
                          style={{
                            flex: 1, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            color: form.strategicPriority === p ? '#fff' : priorityColors[p],
                            background: form.strategicPriority === p ? priorityColors[p] : 'var(--color-bg)',
                            border: `1px solid ${form.strategicPriority === p ? priorityColors[p] : 'var(--color-border)'}`,
                            cursor: 'pointer', textTransform: 'capitalize', transition: 'all 100ms',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Contact */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Key Contact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input
                      type="text" value={form.contactName}
                      onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                      placeholder="e.g. Dr. Sarah Martinez"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <input
                      type="text" value={form.contactRole}
                      onChange={e => setForm(f => ({ ...f, contactRole: e.target.value }))}
                      placeholder="e.g. Head of Procurement"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email" value={form.contactEmail}
                      onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                      placeholder="sarah@hospital.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel" value={form.contactPhone}
                      onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                      placeholder="+33 1 23 45 67 89"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Notes</div>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Add any notes about this account — strategy, upcoming meetings, risks…"
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              flexShrink: 0, background: 'var(--color-bg)',
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  color: 'var(--color-text-secondary)', background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  color: '#fff',
                  background: form.name.trim() ? 'var(--color-interactive)' : '#ccc',
                  border: 'none',
                  cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease-out',
                }}
              >
                {isNew ? 'Add Account' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
