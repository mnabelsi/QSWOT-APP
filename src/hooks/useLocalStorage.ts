import { useState, useEffect, useRef } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize from cache immediately for fast render
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch { /* ignore */ }
    return defaultValue;
  });

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
        if (data !== null && mounted) {
          setState(data);
          // Update local cache too
          localStorage.setItem(key, JSON.stringify(data));
        }
      } catch (err) {
        console.error('Failed to sync from database:', err);
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
