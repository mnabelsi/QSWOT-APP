import { AnimatePresence, motion } from 'framer-motion';
import { useKAMStore } from '../hooks/useKAMStore';

export default function Toast() {
  const { toasts, dismissToast } = useKAMStore();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => dismissToast(toast.id)}
            style={{
              pointerEvents: 'auto',
              background: 'var(--color-topbar)',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              maxWidth: 340,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
