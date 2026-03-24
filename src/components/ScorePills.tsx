import type { Benchmark } from '../types';

const pillColors: Record<number, { bg: string; fill: string }> = {
  3: { bg: '#e8f5e0', fill: '#4a8c1c' },
  2: { bg: '#f0f7e8', fill: '#7ab840' },
  1: { bg: '#f8f8f0', fill: '#b0a860' },
  0: { bg: '#fef8e8', fill: '#c48a0a' },
  [-1]: { bg: '#fde8e8', fill: '#c03030' },
};

interface ScorePillsProps {
  benchmarks: Benchmark[];
  selectedScore: number | undefined;
  onSelect: (score: number) => void;
}

export default function ScorePills({ benchmarks, selectedScore, onSelect }: ScorePillsProps) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {benchmarks.map(bm => {
        const isSelected = selectedScore === bm.score;
        const colors = pillColors[bm.score] || pillColors[0];
        return (
          <button
            key={bm.score}
            onClick={() => onSelect(bm.score)}
            title={`${bm.label} (${bm.score > 0 ? '+' : ''}${bm.score})`}
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: isSelected ? `2px solid ${colors.fill}` : '1px solid var(--color-border)',
              background: isSelected ? colors.fill : colors.bg,
              cursor: 'pointer',
              padding: 0,
              transition: 'all 100ms ease-out',
            }}
          />
        );
      })}
    </div>
  );
}
