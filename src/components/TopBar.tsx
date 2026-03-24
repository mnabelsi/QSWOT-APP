import { useKAMStore } from '../hooks/useKAMStore';
import type { Screen } from '../types';

const navItems: { label: string; screen: Screen }[] = [
  { label: 'Portfolio', screen: 'portfolio' },
  { label: 'Accounts', screen: 'accounts' },
  { label: 'Templates', screen: 'templates' },
];

export default function TopBar() {
  const { activeScreen, setActiveScreen, activeTemplate, accounts } = useKAMStore();

  return (
    <header
      style={{
        background: 'var(--color-topbar)',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'var(--color-interactive)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff', fontWeight: 800,
        }}>
          K
        </div>
        <span style={{
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
        }}>
          KAM Intelligence
        </span>
      </div>

      {/* Navigation */}
      <nav style={{
        display: 'flex', gap: 2,
        background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 2,
      }}>
        {navItems.map(item => (
          <button
            key={item.screen}
            onClick={() => setActiveScreen(item.screen)}
            style={{
              padding: '5px 16px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: activeScreen === item.screen ? 600 : 500,
              color: activeScreen === item.screen ? '#ffffff' : 'rgba(255,255,255,0.45)',
              background: activeScreen === item.screen ? 'var(--color-interactive)' : 'transparent',
              transition: 'all 150ms ease-out',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140, justifyContent: 'flex-end' }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
          {activeTemplate.name}
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.25)',
            fontSize: 10,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 7px',
            borderRadius: 5,
          }}
        >
          {accounts.length}
        </span>
      </div>
    </header>
  );
}
