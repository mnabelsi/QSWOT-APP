import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Benchmark } from '../types';

const scoreColors: Record<number, { bg: string; border: string; text: string }> = {
  3: { bg: '#e8f5e0', border: '#4a8c1c', text: '#3a7014' },
  2: { bg: '#f0f7e8', border: '#7ab840', text: '#5a9020' },
  1: { bg: '#f8f8f0', border: '#b0a860', text: '#808040' },
  0: { bg: '#fef8e8', border: '#c48a0a', text: '#a07008' },
  [-1]: { bg: '#fde8e8', border: '#c03030', text: '#a02020' },
};

interface BenchmarkCardsProps {
  benchmarks: Benchmark[];
  selectedScore: number | undefined;
  onSelect: (score: number) => void;
}

export default function BenchmarkCards({ benchmarks, selectedScore, onSelect }: BenchmarkCardsProps) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      {benchmarks.map(bm => {
        const isSelected = selectedScore === bm.score;
        const isHovered = hoveredScore === bm.score;
        const colors = scoreColors[bm.score] || scoreColors[0];

        return (
          <motion.button
            key={bm.score}
            onClick={() => onSelect(bm.score)}
            onMouseEnter={() => setHoveredScore(bm.score)}
            onMouseLeave={() => setHoveredScore(null)}
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: isSelected ? 1.02 : 1,
              borderColor: isSelected ? colors.border : isHovered ? colors.border + '80' : 'var(--color-border)',
              background: isSelected ? colors.bg : 'var(--color-surface)',
            }}
            transition={{ duration: 0.1 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '14px 8px',
              borderRadius: 12,
              border: `2px solid`,
              cursor: 'pointer',
              minWidth: 0,
              position: 'relative',
            }}
          >
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: isSelected ? colors.text : 'var(--color-text-primary)',
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}>
              {bm.label}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: isSelected ? colors.text : 'var(--color-text-tertiary)',
              opacity: 0.8,
            }}>
              {bm.score > 0 ? `+${bm.score}` : bm.score}
            </span>
            {isSelected && (
              <motion.div
                layoutId="selected-indicator"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  left: '25%',
                  right: '25%',
                  height: 3,
                  borderRadius: 2,
                  background: colors.border,
                }}
                initial={false}
                transition={{ duration: 0.15 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
