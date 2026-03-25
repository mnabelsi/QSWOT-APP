import { useState, useEffect, useRef } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Always start with the default empty value to enforce the Database as the single source of truth.
  // We no longer read from localStorage immediately, so you don't see ghost data from the browser.
  const [state, setState] = useState<T>(defaultValue);

  const isFirstRender = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Fetch from Hostinger MySQL on mount
  useEffect(() => {
    let mounted = true;
    const loadFromDB = async () => {
      try {
        const res = await fetch(`/api/state?key=${key}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (mounted) {
          if (data !== null) {
            setState(data);
          } else {
            // If the database is completely empty (no rows for this key),
            // we just keep the empty defaultValue. We don't load from localStorage.
          }
        }
      } catch (err) {
        console.error('Failed to sync from database:', err);
        // Only if the database is 100% offline do we attempt to rescue data from the browser
        if (mounted) {
          try {
            const stored = localStorage.getItem(key);
            if (stored !== null) setState(JSON.parse(stored));
          } catch { /* ignore */ }
        }
      }
    };
    loadFromDB();
    return () => { mounted = false; };
  }, [key]);

  // 2. Debounced save to MySQL
  useEffect(() => {
    // Skip the absolute first render so we don't overwrite DB with empty default state before loading
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      try {
        // Fast local save
        localStorage.setItem(key, JSON.stringify(state));
        
        // Background DB sync
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, state })
        });
      } catch (err) {
        console.error('Failed to save to database:', err);
      }
    }, 700);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [key, state]);

  return [state, setState];
}
