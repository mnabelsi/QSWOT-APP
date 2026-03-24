import { AnimatePresence, motion } from 'framer-motion';
import { KAMProvider, useKAMStore } from './hooks/useKAMStore';
import TopBar from './components/TopBar';
import PortfolioScreen from './components/PortfolioScreen';
import AccountsScreen from './components/AccountsScreen';
import TemplatesScreen from './components/TemplatesScreen';
import ScoreSlideOver from './components/ScoreSlideOver';
import Toast from './components/Toast';

function AppContent() {
  const { activeScreen } = useKAMStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeScreen === 'portfolio' && <PortfolioScreen />}
            {activeScreen === 'accounts' && <AccountsScreen />}
            {activeScreen === 'templates' && <TemplatesScreen />}
          </motion.div>
        </AnimatePresence>
      </main>
      <ScoreSlideOver />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <KAMProvider>
      <AppContent />
    </KAMProvider>
  );
}
