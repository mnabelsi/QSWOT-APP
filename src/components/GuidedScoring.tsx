import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Criterion } from '../types';
import { useKAMStore } from '../hooks/useKAMStore';
import BenchmarkCards from './BenchmarkCards';

interface GuidedScoringProps {
  accountId: string;
}

export default function GuidedScoring({ accountId }: GuidedScoringProps) {
  const { activeTemplate, scores, setScore } = useKAMStore();

  const allCriteria = [
    ...activeTemplate.attractivenessCriteria.map(c => ({ ...c, axis: 'attractiveness' as const })),
    ...activeTemplate.capabilityCriteria.map(c => ({ ...c, axis: 'capability' as const })),
  ];

  const [currentIndex, setCurrentIndex] = useState(() => {
    // Start at first unscored criterion
    const accountScores = scores[accountId] || {};
    const firstUnscored = allCriteria.findIndex(c => accountScores[c.id] === undefined);
    return firstUnscored >= 0 ? firstUnscored : 0;
  });

  const [direction, setDirection] = useState(0);

  const current = allCriteria[currentIndex];
  const accountScores = scores[accountId] || {};
  const selectedScore = accountScores[current?.id];
  const totalCriteria = allCriteria.length;

  // Determine if we're crossing the axis boundary
  const attractivenessCount = activeTemplate.attractivenessCriteria.length;
  const isCapabilitySection = currentIndex >= attractivenessCount;
  const isPreviousAttractivenessSection = currentIndex > 0 && currentIndex - 1 < attractivenessCount && isCapabilitySection;

  const goNext = useCallback(() => {
    if (currentIndex < totalCriteria - 1) {
      setDirection(1);
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, totalCriteria]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  const handleSelect = useCallback((score: number) => {
    setScore(accountId, current.id, score);
    // Auto-advance after 400ms
    if (currentIndex < totalCriteria - 1) {
      setTimeout(() => {
        goNext();
      }, 400);
    }
  }, [accountId, current, currentIndex, totalCriteria, goNext, setScore]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '5') {
        const scoreMap = [3, 2, 1, 0, -1];
        const idx = parseInt(e.key) - 1;
        handleSelect(scoreMap[idx]);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSelect, goNext, goPrev]);

  if (!current) return null;

  const weightPercent = Math.round(current.weight * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Progress bar */}
      <div style={{ padding: '0 0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)' }}>
            {currentIndex + 1} of {totalCriteria}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              style={{
                fontSize: 12, fontWeight: 500, color: currentIndex > 0 ? 'var(--color-interactive)' : 'var(--color-text-tertiary)',
                background: 'none', border: 'none', cursor: currentIndex > 0 ? 'pointer' : 'default',
                opacity: currentIndex > 0 ? 1 : 0.4,
              }}
            >
              ← Prev
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex >= totalCriteria - 1}
              style={{
                fontSize: 12, fontWeight: 500, color: currentIndex < totalCriteria - 1 ? 'var(--color-interactive)' : 'var(--color-text-tertiary)',
                background: 'none', border: 'none', cursor: currentIndex < totalCriteria - 1 ? 'pointer' : 'default',
                opacity: currentIndex < totalCriteria - 1 ? 1 : 0.4,
              }}
            >
              Skip →
            </button>
          </div>
        </div>
        <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'var(--color-interactive)', borderRadius: 2 }}
            animate={{ width: `${((currentIndex + 1) / totalCriteria) * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>

      {/* Axis section header */}
      {(currentIndex === 0 || isPreviousAttractivenessSection) && (
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: isCapabilitySection ? 'var(--color-accent-blue)' : 'var(--color-accent-coral)',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid var(--color-border)',
        }}>
          {isCapabilitySection ? '● Capability to Serve' : '● Opportunity Attractiveness'}
        </div>
      )}

      {/* Criterion card */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            background: 'var(--color-bg)',
            borderRadius: 20,
            padding: 24,
            border: '1px solid var(--color-border)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Criterion header */}
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
              {current.name}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {current.unit} · Weight: {weightPercent}%
            </span>
          </div>

          {/* Benchmark cards */}
          <BenchmarkCards
            benchmarks={current.benchmarks}
            selectedScore={selectedScore}
            onSelect={handleSelect}
          />

          {/* Currently selected */}
          {selectedScore !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              Currently: {selectedScore > 0 ? `+${selectedScore}` : selectedScore} — {current.benchmarks.find(b => b.score === selectedScore)?.label}
            </motion.div>
          )}

          {/* Keyboard hint */}
          <div style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            marginTop: 'auto',
          }}>
            Press 1–5 to score · ← → to navigate
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Done button on last criterion */}
      {currentIndex === totalCriteria - 1 && (
        <div style={{ paddingTop: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            ✓ All criteria reviewed
          </span>
        </div>
      )}
    </div>
  );
}
