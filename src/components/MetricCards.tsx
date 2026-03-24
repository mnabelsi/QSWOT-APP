import { useKAMStore } from '../hooks/useKAMStore';

export default function MetricCards() {
  const { enrichedAccounts } = useKAMStore();

  const total = enrichedAccounts.length;
  const green = enrichedAccounts.filter(a => a.zone === 'green').length;
  const yellow = enrichedAccounts.filter(a => a.zone === 'yellow').length;
  const red = enrichedAccounts.filter(a => a.zone === 'red').length;

  const totalScored = enrichedAccounts.reduce((sum, a) => sum + a.scoredCount, 0);
  const totalCriteria = enrichedAccounts.reduce((sum, a) => sum + a.totalCriteria, 0);
  const completeness = totalCriteria > 0 ? Math.round((totalScored / totalCriteria) * 100) : 0;

  const cards = [
    { label: 'Total', value: total, color: 'var(--color-text-primary)', dot: undefined },
    { label: 'Green', value: green, color: 'var(--color-zone-green)', dot: '#4a8c1c' },
    { label: 'Yellow', value: yellow, color: 'var(--color-zone-amber)', dot: '#c48a0a' },
    { label: 'Red', value: red, color: 'var(--color-zone-red)', dot: '#c03030' },
    { label: 'Scored', value: `${completeness}%`, color: 'var(--color-interactive)', dot: undefined },
  ];

  return (
    <>
      {cards.map(card => (
        <div
          key={card.label}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {card.dot && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: card.dot, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
              {card.label}
            </span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: card.color, letterSpacing: '-0.02em' }}>
            {card.value}
          </span>
        </div>
      ))}
    </>
  );
}
