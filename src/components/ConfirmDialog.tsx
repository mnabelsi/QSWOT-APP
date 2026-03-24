import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  requireTyped?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  requireTyped,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  const canConfirm = requireTyped ? typed === requireTyped : true;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setTyped('');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
              border: '1px solid var(--color-border)',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>
              {title}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              {message}
            </p>

            {requireTyped && (
              <input
                type="text"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={`Type "${requireTyped}" to confirm`}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  fontSize: 14,
                  marginBottom: 16,
                  background: 'var(--color-bg)',
                }}
              />
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={onCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#ffffff',
                  background: danger
                    ? canConfirm ? 'var(--color-zone-red)' : '#ccc'
                    : canConfirm ? 'var(--color-interactive)' : '#ccc',
                  cursor: canConfirm ? 'pointer' : 'not-allowed',
                  border: 'none',
                  opacity: canConfirm ? 1 : 0.6,
                  transition: 'all 150ms ease-out',
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
