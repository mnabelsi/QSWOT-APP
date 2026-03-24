import { useState } from 'react';
import type { Template, Criterion } from '../types';
import { useKAMStore } from '../hooks/useKAMStore';
import CriterionAccordion from './CriterionAccordion';
import WeightIndicator from './WeightIndicator';
import { generateId } from '../lib/ids';

interface TemplateEditorProps {
  template: Template;
  onClose: () => void;
}

function makeBlankCriterion(sortOrder: number): Criterion {
  return {
    id: generateId(),
    name: 'New criterion',
    unit: '',
    weight: 0,
    sortOrder,
    benchmarks: [
      { score: 3, label: 'Best' },
      { score: 2, label: 'Good' },
      { score: 1, label: 'Average' },
      { score: 0, label: 'Below average' },
      { score: -1, label: 'Poor' },
    ],
  };
}

export default function TemplateEditor({ template, onClose }: TemplateEditorProps) {
  const { updateTemplate } = useKAMStore();
  const [local, setLocal] = useState<Template>({ ...template });

  const save = (updated: Template) => {
    setLocal(updated);
    updateTemplate(updated);
  };

  const attractivenessWeightSum = local.attractivenessCriteria.reduce((s, c) => s + c.weight, 0);
  const capabilityWeightSum = local.capabilityCriteria.reduce((s, c) => s + c.weight, 0);

  const updateCriterion = (axis: 'attractiveness' | 'capability', updated: Criterion) => {
    const key = axis === 'attractiveness' ? 'attractivenessCriteria' : 'capabilityCriteria';
    save({ ...local, [key]: local[key].map(c => c.id === updated.id ? updated : c) });
  };

  const deleteCriterion = (axis: 'attractiveness' | 'capability', id: string) => {
    const key = axis === 'attractiveness' ? 'attractivenessCriteria' : 'capabilityCriteria';
    save({ ...local, [key]: local[key].filter(c => c.id !== id) });
  };

  const addCriterion = (axis: 'attractiveness' | 'capability') => {
    const key = axis === 'attractiveness' ? 'attractivenessCriteria' : 'capabilityCriteria';
    const sortOrder = local[key].length;
    save({ ...local, [key]: [...local[key], makeBlankCriterion(sortOrder)] });
  };

  const handleDragStart = (axis: 'attractiveness' | 'capability', index: number, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ axis, index }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (axis: 'attractiveness' | 'capability', dropIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.axis !== axis) return;
      const key = axis === 'attractiveness' ? 'attractivenessCriteria' : 'capabilityCriteria';
      const items = [...local[key]];
      const [moved] = items.splice(data.index, 1);
      items.splice(dropIndex, 0, moved);
      save({ ...local, [key]: items.map((c, i) => ({ ...c, sortOrder: i })) });
    } catch { }
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    fontSize: 14,
    background: 'var(--color-bg)',
    width: '100%',
  };

  const renderPanel = (
    axis: 'attractiveness' | 'capability',
    label: string,
    color: string,
    criteria: Criterion[],
    weightSum: number
  ) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <WeightIndicator total={weightSum} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {criteria.map((c, i) => (
          <div
            key={c.id}
            draggable
            onDragStart={e => handleDragStart(axis, i, e)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(axis, i, e)}
          >
            <CriterionAccordion
              criterion={c}
              onUpdate={updated => updateCriterion(axis, updated)}
              onDelete={() => deleteCriterion(axis, c.id)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => addCriterion(axis)}
        style={{
          marginTop: 10, padding: '8px 14px', borderRadius: 8,
          fontSize: 12, fontWeight: 500,
          color: 'var(--color-interactive)',
          background: 'rgba(108,92,231,0.06)',
          border: '1px dashed rgba(108,92,231,0.3)',
          cursor: 'pointer', width: '100%',
          transition: 'all 150ms ease-out',
        }}
      >
        + Add criterion
      </button>
    </div>
  );

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={local.name}
            onChange={e => save({ ...local, name: e.target.value })}
            style={{ ...inputStyle, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', background: 'transparent', border: 'none', padding: '0 0 4px' }}
          />
          <input
            type="text"
            value={local.description}
            onChange={e => save({ ...local, description: e.target.value })}
            placeholder="Template description"
            style={{ ...inputStyle, fontSize: 13, color: 'var(--color-text-secondary)', background: 'transparent', border: 'none', padding: '0' }}
          />
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '6px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 500,
            color: 'var(--color-text-secondary)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'flex', gap: 24 }}>
        {renderPanel('attractiveness', 'Opportunity Attractiveness', 'var(--color-accent-coral)', local.attractivenessCriteria, attractivenessWeightSum)}
        {renderPanel('capability', 'Capability to Serve', 'var(--color-accent-blue)', local.capabilityCriteria, capabilityWeightSum)}
      </div>
    </div>
  );
}
