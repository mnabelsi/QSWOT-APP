import { useState } from 'react';
import type { Template, Criterion, AccountFieldDef, ChartDisplayConfig } from '../types';
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

function makeBlankField(index: number): AccountFieldDef {
  return { id: generateId(), key: `customField${index + 1}`, name: 'New field', type: 'text' };
}

// ─────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────

const microLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)',
  letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4,
};

const cellInput: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border)',
  background: 'var(--color-surface)', color: 'var(--color-text-primary)',
  fontSize: 11, boxSizing: 'border-box',
};

const TYPE_COLORS: Record<string, string> = { number: '#0984e3', text: '#00b894', select: '#6c5ce7' };

const STD_SIZE_OPTS = [{ key: 'size', label: 'Revenue (K€)' }];
const STD_COLOR_OPTS = [
  { key: 'zone', label: 'Performance Zone' },
  { key: 'contractStatus', label: 'Contract Status' },
  { key: 'strategicPriority', label: 'Strategic Priority' },
  { key: 'type', label: 'Account Type' },
  { key: 'ownership', label: 'Ownership' },
];

// ─────────────────────────────────────────────────────────────
// Field row editor
// ─────────────────────────────────────────────────────────────

function FieldRow({ field, onChange, onDelete }: { field: AccountFieldDef; onChange: (u: AccountFieldDef) => void; onDelete: () => void }) {
  const update = (patch: Partial<AccountFieldDef>) => onChange({ ...field, ...patch });

  const handleTypeChange = (type: AccountFieldDef['type']) => {
    const patch: Partial<AccountFieldDef> = { type };
    if (type !== 'number') patch.unit = undefined;
    if (type !== 'select') patch.options = undefined;
    update(patch);
  };

  return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 10, border: '1px solid var(--color-border)', padding: '11px 13px', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
          background: TYPE_COLORS[field.type] + '20', color: TYPE_COLORS[field.type],
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {field.type}
        </span>
        <input
          value={field.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="Field name"
          style={{ ...cellInput, flex: 1, fontSize: 12, fontWeight: 600 }}
        />
        <span style={{
          fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-tertiary)',
          background: 'var(--color-border)', padding: '2px 6px', borderRadius: 4,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {field.key}
        </span>
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: '0 2px' }}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 110 }}>
          <div style={microLabel}>Type</div>
          <select
            value={field.type}
            onChange={e => handleTypeChange(e.target.value as AccountFieldDef['type'])}
            style={{ ...cellInput, fontSize: 11 }}
          >
            <option value="number">number</option>
            <option value="text">text</option>
            <option value="select">select</option>
          </select>
        </div>
        {field.type === 'number' && (
          <div style={{ flex: 1 }}>
            <div style={microLabel}>Unit</div>
            <input
              value={field.unit ?? ''}
              onChange={e => update({ unit: e.target.value })}
              placeholder="e.g. beds, K€, visitors/mo"
              style={cellInput}
            />
          </div>
        )}
        {field.type === 'select' && (
          <div style={{ flex: 1 }}>
            <div style={microLabel}>Options (comma-separated)</div>
            <input
              value={(field.options ?? []).join(', ')}
              onChange={e => update({ options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. Small, Medium, Large"
              style={cellInput}
            />
          </div>
        )}
        {field.type === 'text' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Free-text input field.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chart config panel
// ─────────────────────────────────────────────────────────────

function ChartConfigPanel({ fields, config, onChange }: {
  fields: AccountFieldDef[];
  config: ChartDisplayConfig;
  onChange: (patch: Partial<ChartDisplayConfig>) => void;
}) {
  const numFields = fields.filter(f => f.type === 'number');
  const catFields = fields.filter(f => f.type === 'select' || f.type === 'text');
  return (
    <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 10, background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.15)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Portfolio Chart Configuration</div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={microLabel}>Bubble Size represents</div>
          <select value={config.sizeField} onChange={e => onChange({ sizeField: e.target.value })} style={{ ...cellInput, fontSize: 12 }}>
            {STD_SIZE_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            {numFields.map(f => <option key={f.key} value={f.key}>{f.name}{f.unit ? ` (${f.unit})` : ''}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={microLabel}>Bubble Color represents</div>
          <select value={config.colorField} onChange={e => onChange({ colorField: e.target.value })} style={{ ...cellInput, fontSize: 12 }}>
            {STD_COLOR_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            {catFields.map(f => <option key={f.key} value={f.key}>{f.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main editor
// ─────────────────────────────────────────────────────────────

export default function TemplateEditor({ template, onClose }: TemplateEditorProps) {
  const { updateTemplate } = useKAMStore();
  const [local, setLocal] = useState<Template>({
    ...template,
    accountFields: template.accountFields ?? [],
    chartConfig: template.chartConfig ?? { sizeField: 'size', colorField: 'zone' },
  });

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

  const updateField = (index: number, updated: AccountFieldDef) => {
    const fields = [...(local.accountFields ?? [])];
    fields[index] = updated;
    save({ ...local, accountFields: fields });
  };

  const deleteField = (index: number) => {
    save({ ...local, accountFields: (local.accountFields ?? []).filter((_, i) => i !== index) });
  };

  const addField = () => {
    const fields = local.accountFields ?? [];
    save({ ...local, accountFields: [...fields, makeBlankField(fields.length)] });
  };

  const updateChartConfig = (patch: Partial<ChartDisplayConfig>) => {
    save({ ...local, chartConfig: { ...(local.chartConfig ?? { sizeField: 'size', colorField: 'zone' }), ...patch } });
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    fontSize: 14,
    background: 'var(--color-bg)',
    width: '100%',
  };

  const renderCriteriaPanel = (
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

  const accountFields = local.accountFields ?? [];
  const chartConfig = local.chartConfig ?? { sizeField: 'size', colorField: 'zone' };

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

      {/* Criteria panels */}
      <div style={{ display: 'flex', gap: 24 }}>
        {renderCriteriaPanel('attractiveness', 'Opportunity Attractiveness', 'var(--color-accent-coral)', local.attractivenessCriteria, attractivenessWeightSum)}
        {renderCriteriaPanel('capability', 'Capability to Serve', 'var(--color-accent-blue)', local.capabilityCriteria, capabilityWeightSum)}
      </div>

      {/* Custom account fields */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>
              Custom Account Fields
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
              {accountFields.length} field{accountFields.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={addField}
            style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              color: 'var(--color-interactive)', background: 'rgba(108,92,231,0.08)',
              border: '1px dashed rgba(108,92,231,0.3)', cursor: 'pointer',
            }}
          >
            + Add field
          </button>
        </div>

        {accountFields.length > 0 ? (
          accountFields.map((f, i) => (
            <FieldRow
              key={f.id}
              field={f}
              onChange={updated => updateField(i, updated)}
              onDelete={() => deleteField(i)}
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--color-text-tertiary)', fontSize: 12, border: '1px dashed var(--color-border)', borderRadius: 8 }}>
            No custom fields — click "+ Add field" to add account-specific data columns.
          </div>
        )}

        <ChartConfigPanel
          fields={accountFields}
          config={chartConfig}
          onChange={updateChartConfig}
        />
      </div>
    </div>
  );
}
