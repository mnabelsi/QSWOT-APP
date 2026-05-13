import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKAMStore } from '../hooks/useKAMStore';
import type { EnrichedAccount } from '../types';
import { formatCurrency } from '../lib/currency';
import { useLocalStorage } from '../hooks/useLocalStorage';
import ZoneBadge from './ZoneBadge';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const ALL_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'size', label: 'Size (€)' },
  { id: 'type', label: 'Type' },
  { id: 'beds', label: 'Capacity' },
  { id: 'territory', label: 'Territory' },
  { id: 'ownership', label: 'Ownership' },
  { id: 'contractStatus', label: 'Contract' },
  { id: 'strategicPriority', label: 'Priority' },
  { id: 'zone', label: 'Performance Zone' },
  { id: 'scoredCount', label: 'Scoring' },
  { id: 'contactName', label: 'Contact Name' },
  { id: 'contactRole', label: 'Contact Role' },
  { id: 'contactEmail', label: 'Contact Email' },
  { id: 'notes', label: 'Notes' },
  { id: 'createdAt', label: 'Added Date' },
];

const getSortValue = (acc: EnrichedAccount, key: string): string | number | undefined => {
  if (key === 'contactName') return acc.contact?.name;
  if (key === 'contactRole') return acc.contact?.role;
  if (key === 'contactEmail') return acc.contact?.email;
  return acc[key as keyof EnrichedAccount] as any;
};

export default function AccountsTable({ onEdit }: { onEdit: (id: string) => void }) {
  const { enrichedAccounts, deleteAccount } = useKAMStore();
  
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'size', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [storedCols, setStoredCols] = useLocalStorage<string[]>('qswot-table-cols', ['name', 'size', 'type', 'territory', 'contractStatus', 'zone', 'scoredCount']);
  const visibleColumns = useMemo(() => new Set(storedCols), [storedCols]);
  
  const [showColSelector, setShowColSelector] = useState(false);

  // Filtering
  const filteredData = useMemo(() => {
    return enrichedAccounts.filter(acc => {
      if (!search) return true;
      const lowerSearch = search.toLowerCase();
      return (
        acc.name.toLowerCase().includes(lowerSearch) ||
        (acc.territory && acc.territory.toLowerCase().includes(lowerSearch)) ||
        acc.type.toLowerCase().includes(lowerSearch)
      );
    });
  }, [enrichedAccounts, search]);

  // Sorting
  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      const aVal = getSortValue(a, sortConfig.key);
      const bVal = getSortValue(b, sortConfig.key);
      
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const compare = aVal.localeCompare(bVal);
        return sortConfig.direction === 'asc' ? compare : -compare;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return data;
  }, [filteredData, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === sortedData.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedData.map(a => a.id)));
  };

  const toggleColumn = (colId: string) => {
    const next = new Set(visibleColumns);
    if (next.has(colId)) next.delete(colId);
    else next.add(colId);
    if (next.size > 0) setStoredCols(Array.from(next)); // Prevent hiding all
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} accounts?`)) {
      Array.from(selectedIds).forEach(id => deleteAccount(id));
      setSelectedIds(new Set());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      
      {/* Table Toolbar */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', gap: 16 }}>
        
        {/* Bulk Actions or Search */}
        <AnimatePresence mode="wait">
          {selectedIds.size > 0 ? (
            <motion.div
              key="bulk"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-interactive)' }}>
                {selectedIds.size} account{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  color: '#dc2626', background: '#fef2f2', border: '1px solid #f87171',
                  cursor: 'pointer'
                }}
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  color: 'var(--color-text-secondary)', background: 'transparent', border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, position: 'relative' }}
            >
              <span style={{ position: 'absolute', left: 12, top: 10, fontSize: 13, color: 'var(--color-text-tertiary)' }}>🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search accounts by name, territory, or type..."
                style={{
                  width: '100%', maxWidth: 400, padding: '8px 12px 8px 36px',
                  borderRadius: 8, border: '1px solid var(--color-border)',
                  fontSize: 13, background: 'var(--color-bg)', outline: 'none'
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Column Selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowColSelector(!showColSelector)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: 'var(--color-text-primary)', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            Columns ▾
          </button>
          
          <AnimatePresence>
            {showColSelector && (
              <>
                <div onClick={() => setShowColSelector(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: 8, zIndex: 20, minWidth: 180
                  }}
                >
                  {ALL_COLUMNS.map(col => (
                    <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', borderRadius: 6, ':hover': { background: 'var(--color-bg)' } } as any}>
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.id)}
                        onChange={() => toggleColumn(col.id)}
                        style={{ accentColor: 'var(--color-interactive)' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{col.label}</span>
                    </label>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 5 }}>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', width: 40 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === sortedData.length && sortedData.length > 0}
                  ref={input => { if (input) input.indeterminate = selectedIds.size > 0 && selectedIds.size < sortedData.length; }}
                  onChange={toggleAll}
                  style={{ accentColor: 'var(--color-interactive)' }}
                />
              </th>
              {ALL_COLUMNS.map(col => visibleColumns.has(col.id) && (
                <th
                  key={col.id}
                  onClick={() => handleSort(col.id as any)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
                    fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
                    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {sortConfig.key === col.id ? (
                      <span style={{ color: 'var(--color-interactive)' }}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    ) : (
                      <span style={{ opacity: 0 }}>↑</span>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {sortedData.map(account => {
              const rowSelected = selectedIds.has(account.id);
              return (
                <tr
                  key={account.id}
                  style={{
                    background: rowSelected ? 'rgba(108,92,231,0.03)' : 'var(--color-surface)',
                    borderBottom: '1px solid var(--color-border)',
                    transition: 'background 150ms'
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <input
                      type="checkbox"
                      checked={rowSelected}
                      onChange={() => toggleSelection(account.id)}
                      style={{ accentColor: 'var(--color-interactive)' }}
                    />
                  </td>
                  
                  {visibleColumns.has('name') && (
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: account.zone === 'green' ? '#22c55e' : account.zone === 'red' ? '#ef4444' : '#eab308', flexShrink: 0 }} />
                        <span
                          onClick={() => onEdit(account.id)}
                          style={{ color: 'var(--color-interactive)', cursor: 'pointer', outline: 'none' }}
                          onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {account.name}
                        </span>
                      </div>
                    </td>
                  )}
                  
                  {visibleColumns.has('size') && (
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {formatCurrency(account.size)}
                    </td>
                  )}
                  
                  {visibleColumns.has('type') && (
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize' }}>
                        {account.type}
                      </span>
                    </td>
                  )}

                  {visibleColumns.has('beds') && (
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {account.beds ? account.beds.toLocaleString() : '—'}
                    </td>
                  )}
                  
                  {visibleColumns.has('territory') && (
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {account.territory || '—'}
                    </td>
                  )}
                  
                  {visibleColumns.has('ownership') && (
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {account.ownership ? <span style={{ textTransform: 'capitalize' }}>{account.ownership}</span> : '—'}
                    </td>
                  )}
                  
                  {visibleColumns.has('contractStatus') && (
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: account.contractStatus === 'active' ? '#16a34a' : 'var(--color-text-tertiary)', background: account.contractStatus === 'active' ? '#f0fdf4' : 'var(--color-bg)', padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>
                        {account.contractStatus || 'None'}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.has('strategicPriority') && (
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: account.strategicPriority === 'high' ? '#ea580c' : account.strategicPriority === 'medium' ? '#ca8a04' : 'var(--color-text-tertiary)', background: account.strategicPriority === 'high' ? '#fff7ed' : account.strategicPriority === 'medium' ? '#fefce8' : 'var(--color-bg)', padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>
                        {account.strategicPriority || 'Low'}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.has('zone') && (
                    <td style={{ padding: '12px 16px' }}>
                      <ZoneBadge zone={account.zone} />
                    </td>
                  )}
                  
                  {visibleColumns.has('scoredCount') && (
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, minWidth: 40, height: 4, background: 'var(--color-bg)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--color-interactive)', width: `${(account.scoredCount / account.totalCriteria) * 100}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                          {account.scoredCount}/{account.totalCriteria}
                        </span>
                      </div>
                    </td>
                  )}
                  
                  {visibleColumns.has('contactName') && (
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {account.contact?.name || '—'}
                    </td>
                  )}
                  {visibleColumns.has('contactRole') && (
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {account.contact?.role || '—'}
                    </td>
                  )}
                  {visibleColumns.has('contactEmail') && (
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {account.contact?.email ? <a href={`mailto:${account.contact.email}`} style={{ color: 'var(--color-interactive)', textDecoration: 'none' }}>{account.contact.email}</a> : '—'}
                    </td>
                  )}
                  {visibleColumns.has('notes') && (
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {account.notes || '—'}
                    </td>
                  )}
                  {visibleColumns.has('createdAt') && (
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                  )}
                  
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => onEdit(account.id)}
                      style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, color: 'var(--color-interactive)', background: 'transparent', border: '1px solid var(--color-interactive)', borderRadius: 6, cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )
            })}
            
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  No accounts found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
