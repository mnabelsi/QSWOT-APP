import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  inputStyle?: React.CSSProperties;
}

export default function Combobox({ value, onChange, options, placeholder, inputStyle }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search when external value changes
  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Important: When user clicks outside, update the parent state with whatever they typed!
        if (search !== value) {
          onChange(search);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [search, onChange, value]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(s) && o.trim() !== '');
  }, [search, options]);

  const showAdd = search.trim().length > 0 && !options.some(o => o.toLowerCase() === search.trim().toLowerCase());

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
      />
      <AnimatePresence>
        {isOpen && (filtered.length > 0 || showAdd) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: 200, overflowY: 'auto', zIndex: 50, padding: 4
            }}
          >
            {filtered.map(opt => (
              <div
                key={opt}
                onMouseDown={(e) => {
                  // Use onMouseDown instead of onClick to prevent the input onBlur/clickOutside from firing first
                  e.preventDefault(); 
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 4, textTransform: 'capitalize' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                {opt}
              </div>
            ))}
            {showAdd && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(search.trim());
                  setIsOpen(false);
                }}
                style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 4, color: 'var(--color-interactive)', fontWeight: 600 }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                + Add "{search.trim()}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
