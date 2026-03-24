import { useKAMStore } from '../hooks/useKAMStore';
import ScorePills from './ScorePills';

interface OverviewScoringProps {
  accountId: string;
}

export default function OverviewScoring({ accountId }: OverviewScoringProps) {
  const { activeTemplate, scores, setScore } = useKAMStore();
  const accountScores = scores[accountId] || {};

  const sections = [
    {
      label: 'Opportunity Attractiveness',
      color: 'var(--color-accent-coral)',
      criteria: activeTemplate.attractivenessCriteria,
    },
    {
      label: 'Capability to Serve',
      color: 'var(--color-accent-blue)',
      criteria: activeTemplate.capabilityCriteria,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {sections.map(section => (
        <div key={section.label}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: section.color,
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid var(--color-border)',
          }}>
            ● {section.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {section.criteria.map(criterion => {
              const selected = accountScores[criterion.id];
              const weightedScore = selected !== undefined
                ? (selected * criterion.weight * 100).toFixed(0)
                : '—';
              const weightPct = Math.round(criterion.weight * 100);

              return (
                <div
                  key={criterion.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 44px auto 50px',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: selected !== undefined ? 'transparent' : 'rgba(108,92,231,0.03)',
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {criterion.name}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--color-text-tertiary)',
                    textAlign: 'center',
                    background: 'var(--color-bg)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>
                    {weightPct}%
                  </span>
                  <ScorePills
                    benchmarks={criterion.benchmarks}
                    selectedScore={selected}
                    onSelect={(score) => setScore(accountId, criterion.id, score)}
                  />
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: selected !== undefined ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    textAlign: 'right',
                  }}>
                    {weightedScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
