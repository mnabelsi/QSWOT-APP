import { useState } from 'react';
import { useKAMStore } from '../hooks/useKAMStore';
import BubbleChart from './BubbleChart';
import MetricCards from './MetricCards';
import ZoneBadge from './ZoneBadge';
import { exportCSV } from '../lib/csv';
import { formatCurrency } from '../lib/currency';

export default function PortfolioScreen() {
  const { setSelectedAccountId, enrichedAccounts, activeTemplate, scores } = useKAMStore();
  const [showList, setShowList] = useState(true);

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Portfolio Matrix</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            GE/McKinsey 9-cell strategic classification
          </p>
        </div>
        <button
          onClick={() => exportCSV(enrichedAccounts, activeTemplate, scores)}
          disabled={enrichedAccounts.length === 0}
          style={{
            padding: '7px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 500,
            color: enrichedAccounts.length > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            cursor: enrichedAccounts.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 150ms ease-out',
            opacity: enrichedAccounts.length > 0 ? 1 : 0.5,
          }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Chart + Metrics side-by-side on large screens */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
        {/* Chart */}
        <div style={{
          flex: 1,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12, padding: 12,
          minWidth: 0,
        }}>
          <BubbleChart onBubbleClick={setSelectedAccountId} />
        </div>

        {/* Metrics sidebar */}
        <div style={{
          width: 150, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <MetricCards />
        </div>
      </div>

      {/* Account list */}
      <div>
        <button
          onClick={() => setShowList(!showList)}
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 0', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{
            transform: showList ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform 150ms', display: 'inline-block', fontSize: 10,
          }}>▸</span>
          Account List ({enrichedAccounts.length})
        </button>

        {showList && enrichedAccounts.length > 0 && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                  {['Account', 'Zone', 'Attract.', 'Capability', 'Progress', ''].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrichedAccounts.map(account => (
                  <tr
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: 13 }}>
                      {account.name}
                      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                        {formatCurrency(account.size)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <ZoneBadge zone={account.zone} size="small" />
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-accent-coral)', fontWeight: 600, fontSize: 12 }}>
                      {account.attractivenessScore.toFixed(0)}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-accent-blue)', fontWeight: 600, fontSize: 12 }}>
                      {account.capabilityScore.toFixed(0)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            background: account.scoredCount === account.totalCriteria ? 'var(--color-zone-green)' : 'var(--color-interactive)',
                            width: `${account.totalCriteria > 0 ? (account.scoredCount / account.totalCriteria) * 100 : 0}%`,
                          }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                          {account.scoredCount}/{account.totalCriteria}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <span style={{ color: 'var(--color-interactive)', fontSize: 12, fontWeight: 500 }}>Score →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {enrichedAccounts.length === 0 && showList && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '32px 20px',
            textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13,
          }}>
            No accounts yet — go to the Accounts tab to add some.
          </div>
        )}
      </div>
    </div>
  );
}
