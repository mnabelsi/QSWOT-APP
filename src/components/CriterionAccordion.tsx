import { useState } from 'react';
import type { Criterion, Benchmark } from '../types';

interface BenchmarkEditorProps {
  benchmarks: Benchmark[];
  onChange: (benchmarks: Benchmark[]) => void;
}

export function BenchmarkEditor({ benchmarks, onChange }: BenchmarkEditorProps) {
  const scoreLabels = ['+3', '+2', '+1', '0', '-1'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {benchmarks.map((bm, i) => (
        <div key={bm.score} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 28, fontSize: 11, fontWeight: 600,
            color: 'var(--color-text-tertiary)', textAlign: 'center',
          }}>
            {scoreLabels[i]}
          </span>
          <input
            type="text"
            value={bm.label}
            onChange={e => {
              const next = [...benchmarks];
              next[i] = { ...bm, label: e.target.value };
              onChange(next);
            }}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6,
              border: '1px solid var(--color-border)', fontSize: 13,
              background: 'var(--color-bg)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

interface CriterionAccordionProps {
  criterion: Criterion;
  onUpdate: (c: Criterion) => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export default function CriterionAccordion({ criterion, onUpdate, onDelete, dragHandleProps }: CriterionAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const weightPct = Math.round(criterion.weight * 100);

  const inputStyle = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--color-border)',
    fontSize: 13,
    background: 'var(--color-bg)',
    width: '100%',
  };

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--color-surface)',
    }}>
      {/* Collapsed header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', cursor: 'pointer',
          transition: 'background 150ms',
        }}
      >
        <span
          {...dragHandleProps}
          style={{ cursor: 'grab', color: 'var(--color-text-tertiary)', fontSize: 12, userSelect: 'none' }}
          onClick={e => e.stopPropagation()}
        >
          ⠿
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{criterion.name}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--color-interactive)',
          background: 'rgba(108,92,231,0.08)', padding: '2px 8px', borderRadius: 4,
        }}>
          {weightPct}%
        </span>
        <span style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
          transition: 'transform 150ms',
          display: 'inline-block',
        }}>
          ▸
        </span>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div style={{
          padding: '12px 14px', borderTop: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
              Criterion name
            </label>
            <input
              type="text"
              value={criterion.name}
              onChange={e => onUpdate({ ...criterion, name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
                Unit / Description
              </label>
              <input
                type="text"
                value={criterion.unit}
                onChange={e => onUpdate({ ...criterion, unit: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
                Weight (%)
              </label>
              <input
                type="number"
                value={weightPct}
                onChange={e => onUpdate({ ...criterion, weight: parseInt(e.target.value || '0') / 100 })}
                style={inputStyle}
                min={0}
                max={100}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 6 }}>
              Benchmark labels
            </label>
            <BenchmarkEditor
              benchmarks={criterion.benchmarks}
              onChange={benchmarks => onUpdate({ ...criterion, benchmarks })}
            />
          </div>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                fontSize: 12, fontWeight: 500, color: 'var(--color-zone-red)',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: '4px 0',
              }}
            >
              Delete criterion
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Are you sure?</span>
              <button
                onClick={onDelete}
                style={{
                  fontSize: 11, fontWeight: 600, color: '#fff',
                  background: 'var(--color-zone-red)', padding: '4px 10px',
                  borderRadius: 4, border: 'none', cursor: 'pointer',
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)',
                  background: 'var(--color-bg)', padding: '4px 10px',
                  borderRadius: 4, border: 'none', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
