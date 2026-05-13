import { useState } from 'react';
import { useKAMStore } from '../hooks/useKAMStore';
import { useClaudeConfig } from '../hooks/useClaudeConfig';
import {
  analyzeCompanyWebsite,
  researchPotentialAccounts,
  suggestAccountFields,
  type TemplateAnalysis,
  type SuggestedAccount,
  type FieldSuggestion,
} from '../lib/claude';
import type {
  Template, Criterion, Account,
  AccountType, Ownership, ContractStatus, StrategicPriority,
  AccountFieldDef, ChartDisplayConfig,
} from '../types';
import { generateId } from '../lib/ids';

// ─────────────────────────────────────────────────────────────
// Local editing types
// ─────────────────────────────────────────────────────────────

type WizardStep = 'input' | 'template' | 'fields' | 'accounts' | 'done';

interface LocalCriterion {
  id: string;
  name: string;
  unit: string;
  weightPct: number;
  benchmarks: { score: number; label: string }[];
}

interface LocalField {
  id: string;
  key: string;
  name: string;
  type: 'number' | 'text' | 'select';
  unit?: string;
  options?: string[];
  enabled: boolean;
}

interface LocalAccount {
  idx: number;
  selected: boolean;
  name: string;
  size: string;
  type: string;
  beds: string;
  territory: string;
  ownership: string;
  contractStatus: string;
  strategicPriority: string;
  zone: string;
  notes: string;
  customFields: Record<string, string>;
}

interface Props {
  onClose: () => void;
  onTemplateCreated: (templateId: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Converters
// ─────────────────────────────────────────────────────────────

function toLocalCriterion(c: { name: string; unit: string; weight: number; benchmarks: { score: number; label: string }[] }): LocalCriterion {
  return {
    id: generateId(),
    name: c.name,
    unit: c.unit,
    weightPct: Math.round(c.weight * 100),
    benchmarks: [...c.benchmarks].sort((a, b) => b.score - a.score),
  };
}

function localToKAMCriterion(c: LocalCriterion, sortOrder: number): Criterion {
  return {
    id: c.id,
    name: c.name,
    unit: c.unit,
    weight: c.weightPct / 100,
    sortOrder,
    benchmarks: c.benchmarks,
  };
}

function fieldSuggestionToLocalField(f: FieldSuggestion): LocalField {
  return {
    id: generateId(),
    key: f.key,
    name: f.name,
    type: f.type,
    unit: f.unit,
    options: f.options,
    enabled: true,
  };
}

function toLocalAccount(a: SuggestedAccount, idx: number): LocalAccount {
  const rawCustom = a.customFields ?? {};
  const customFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawCustom)) {
    customFields[k] = String(v);
  }
  return {
    idx,
    selected: true,
    name: a.name,
    size: String(a.size ?? 0),
    type: a.type ?? 'hospital',
    beds: a.beds != null ? String(a.beds) : '',
    territory: a.territory ?? '',
    ownership: a.ownership ?? 'public',
    contractStatus: a.contractStatus ?? 'prospect',
    strategicPriority: a.strategicPriority ?? 'medium',
    zone: a.zone ?? 'yellow',
    notes: a.notes ?? '',
    customFields,
  };
}

function convertCustomFields(
  rawFields: Record<string, string>,
  fieldDefs: LocalField[],
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, val] of Object.entries(rawFields)) {
    const def = fieldDefs.find(f => f.key === key);
    if (def?.type === 'number') {
      const n = Number(val);
      result[key] = isNaN(n) ? 0 : n;
    } else {
      result[key] = val;
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 13, height: 13,
        border: '2px solid rgba(255,255,255,0.35)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'kam-spin 0.65s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Step progress indicator
// ─────────────────────────────────────────────────────────────

const STEP_LABELS = ['Website', 'Template', 'Fields', 'Research', 'Done'];
const STEP_INDEX: Record<WizardStep, number> = { input: 0, template: 1, fields: 2, accounts: 3, done: 4 };

function WizardProgress({ step }: { step: WizardStep }) {
  const activeIdx = STEP_INDEX[step];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 28 }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < STEP_LABELS.length - 1 ? 1 : undefined }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: i <= activeIdx ? 'var(--color-interactive)' : 'var(--color-border)',
              color: i <= activeIdx ? '#fff' : 'var(--color-text-tertiary)',
              transition: 'all 200ms ease',
              flexShrink: 0,
            }}>
              {i < activeIdx ? '✓' : i + 1}
            </div>
            <span style={{
              fontSize: 10, marginTop: 5, fontWeight: i === activeIdx ? 600 : 400,
              color: i <= activeIdx ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '12px 6px 0',
              background: i < activeIdx ? 'var(--color-interactive)' : 'var(--color-border)',
              transition: 'background 250ms ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Criterion card (inline editable)
// ─────────────────────────────────────────────────────────────

function CriterionCard({
  criterion,
  onChange,
  onDelete,
}: {
  criterion: LocalCriterion;
  onChange: (updated: LocalCriterion) => void;
  onDelete: () => void;
}) {
  const update = (patch: Partial<LocalCriterion>) => onChange({ ...criterion, ...patch });
  const updateBenchmark = (score: number, label: string) =>
    onChange({ ...criterion, benchmarks: criterion.benchmarks.map(b => b.score === score ? { ...b, label } : b) });

  return (
    <div style={{
      background: 'var(--color-bg)', borderRadius: 10,
      border: '1px solid var(--color-border)',
      padding: '11px 13px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <input
          value={criterion.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="Criterion name"
          style={{ ...cellInput, flex: 1, fontSize: 12, fontWeight: 600 }}
        />
        <button
          onClick={onDelete}
          title="Remove"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={microLabel}>Unit</div>
          <input
            value={criterion.unit}
            onChange={e => update({ unit: e.target.value })}
            placeholder="e.g. K€/year"
            style={cellInput}
          />
        </div>
        <div style={{ width: 76 }}>
          <div style={microLabel}>Weight %</div>
          <input
            type="number"
            min={0} max={100} step={1}
            value={criterion.weightPct}
            onChange={e => update({ weightPct: Number(e.target.value) })}
            style={cellInput}
          />
        </div>
      </div>

      <div>
        <div style={{ ...microLabel, marginBottom: 5 }}>Benchmarks</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {[3, 2, 1, 0, -1].map(score => {
            const bm = criterion.benchmarks.find(b => b.score === score);
            const scoreColor =
              score === 3 ? 'var(--color-zone-green)'
              : score === -1 ? 'var(--color-zone-red)'
              : 'var(--color-text-tertiary)';
            return (
              <div key={score}>
                <div style={{ fontSize: 9, fontWeight: 700, color: scoreColor, textAlign: 'center', marginBottom: 3 }}>
                  {score > 0 ? `+${score}` : score}
                </div>
                <input
                  value={bm?.label ?? ''}
                  onChange={e => updateBenchmark(score, e.target.value)}
                  placeholder="label"
                  style={{ ...cellInput, fontSize: 10, padding: '4px 5px', textAlign: 'center' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Criteria panel (one axis)
// ─────────────────────────────────────────────────────────────

function CriteriaPanel({
  label,
  accentColor,
  criteria,
  onChange,
}: {
  label: string;
  accentColor: string;
  criteria: LocalCriterion[];
  onChange: (updated: LocalCriterion[]) => void;
}) {
  const totalWeight = criteria.reduce((s, c) => s + c.weightPct, 0);
  const valid = totalWeight === 100;

  function addBlank() {
    const blank: LocalCriterion = {
      id: generateId(),
      name: 'New criterion',
      unit: '',
      weightPct: 0,
      benchmarks: [
        { score: 3, label: 'Best' },
        { score: 2, label: 'Good' },
        { score: 1, label: 'Average' },
        { score: 0, label: 'Below average' },
        { score: -1, label: 'Poor' },
      ],
    };
    onChange([...criteria, blank]);
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: valid ? 'var(--color-zone-green)' : 'var(--color-zone-red)' }}>
            {totalWeight}% {valid ? '✓' : `(need ${100 - totalWeight > 0 ? '+' : ''}${100 - totalWeight}%)`}
          </div>
        </div>
        <button
          onClick={addBlank}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            color: 'var(--color-interactive)', background: 'rgba(108,92,231,0.08)',
            border: 'none', cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>
      <div style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 2 }}>
        {criteria.map((c, i) => (
          <CriterionCard
            key={c.id}
            criterion={c}
            onChange={updated => {
              const next = [...criteria];
              next[i] = updated;
              onChange(next);
            }}
            onDelete={() => onChange(criteria.filter((_, j) => j !== i))}
          />
        ))}
        {criteria.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            No criteria yet — click + Add to start.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Field card
// ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  number: '#0984e3',
  text: '#00b894',
  select: '#6c5ce7',
};

function FieldCard({
  field,
  onChange,
  onDelete,
}: {
  field: LocalField;
  onChange: (updated: LocalField) => void;
  onDelete: () => void;
}) {
  const update = (patch: Partial<LocalField>) => onChange({ ...field, ...patch });

  return (
    <div style={{
      background: 'var(--color-bg)', borderRadius: 10,
      border: `1px solid ${field.enabled ? 'var(--color-border)' : 'var(--color-border)'}`,
      padding: '11px 13px', marginBottom: 8,
      opacity: field.enabled ? 1 : 0.45,
      transition: 'opacity 150ms',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: field.enabled ? 10 : 0 }}>
        {/* Enable toggle */}
        <input
          type="checkbox"
          checked={field.enabled}
          onChange={e => update({ enabled: e.target.checked })}
          style={{ cursor: 'pointer', width: 14, height: 14, flexShrink: 0 }}
        />

        {/* Type badge */}
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: TYPE_COLORS[field.type] + '20',
          color: TYPE_COLORS[field.type],
          letterSpacing: '0.05em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {field.type}
        </span>

        {/* Name */}
        <input
          value={field.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="Field name"
          disabled={!field.enabled}
          style={{ ...cellInput, flex: 1, fontSize: 12, fontWeight: 600 }}
        />

        {/* Key chip */}
        <span style={{
          fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-tertiary)',
          background: 'var(--color-border)', padding: '2px 6px', borderRadius: 4,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {field.key}
        </span>

        <button
          onClick={onDelete}
          title="Remove"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      {field.enabled && (
        <div style={{ display: 'flex', gap: 8, paddingLeft: 22 }}>
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
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>Free-text input field.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chart config panel
// ─────────────────────────────────────────────────────────────

const STANDARD_SIZE_OPTIONS = [{ key: 'size', label: 'Revenue (K€)' }];
const STANDARD_COLOR_OPTIONS = [
  { key: 'zone', label: 'Performance Zone' },
  { key: 'contractStatus', label: 'Contract Status' },
  { key: 'strategicPriority', label: 'Strategic Priority' },
  { key: 'type', label: 'Account Type' },
  { key: 'ownership', label: 'Ownership' },
];

function ChartConfigPanel({
  fields,
  sizeField,
  colorField,
  onSizeChange,
  onColorChange,
}: {
  fields: LocalField[];
  sizeField: string;
  colorField: string;
  onSizeChange: (key: string) => void;
  onColorChange: (key: string) => void;
}) {
  const numericFields = fields.filter(f => f.enabled && f.type === 'number');
  const categoricalFields = fields.filter(f => f.enabled && (f.type === 'select' || f.type === 'text'));

  return (
    <div style={{
      marginTop: 24, padding: '14px 16px', borderRadius: 10,
      background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.15)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--color-text-primary)' }}>
        Portfolio Chart Configuration
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={microLabel}>Bubble Size represents</div>
          <select
            value={sizeField}
            onChange={e => onSizeChange(e.target.value)}
            style={{ ...cellInput, fontSize: 12 }}
          >
            {STANDARD_SIZE_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
            {numericFields.map(f => (
              <option key={f.key} value={f.key}>
                {f.name}{f.unit ? ` (${f.unit})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={microLabel}>Bubble Color represents</div>
          <select
            value={colorField}
            onChange={e => onColorChange(e.target.value)}
            style={{ ...cellInput, fontSize: 12 }}
          >
            {STANDARD_COLOR_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
            {categoricalFields.map(f => (
              <option key={f.key} value={f.key}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Zone select cell color map
// ─────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, string> = {
  green: 'var(--color-zone-green)',
  yellow: 'var(--color-zone-amber)',
  red: 'var(--color-zone-red)',
};

// ─────────────────────────────────────────────────────────────
// Main wizard
// ─────────────────────────────────────────────────────────────

export default function TemplateWizard({ onClose, onTemplateCreated }: Props) {
  const { config } = useClaudeConfig();
  const { addTemplate, addAccount } = useKAMStore();

  const [step, setStep] = useState<WizardStep>('input');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Input step
  const [website, setWebsite] = useState('');
  const [territory, setTerritory] = useState('');

  // Template step
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [attractCriteria, setAttractCriteria] = useState<LocalCriterion[]>([]);
  const [capabCriteria, setCapabCriteria] = useState<LocalCriterion[]>([]);

  // Fields step
  const [fields, setFields] = useState<LocalField[]>([]);
  const [chartSizeField, setChartSizeField] = useState('size');
  const [chartColorField, setChartColorField] = useState('zone');

  // Accounts step
  const [accounts, setAccounts] = useState<LocalAccount[]>([]);
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);

  // ── Step 1 → 2: Analyze website
  async function handleAnalyze() {
    if (!website.trim()) return;
    setLoading('analyzing');
    setError(null);
    try {
      const result = await analyzeCompanyWebsite(config, website.trim());
      setAnalysis(result);
      setTemplateName(`${result.companyName} KAM Template`);
      setAttractCriteria(result.attractivenessCriteria.map(toLocalCriterion));
      setCapabCriteria(result.capabilityCriteria.map(toLocalCriterion));
      setStep('template');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  // ── Step 2 → 3: Discover fields
  async function handleContinueToFields() {
    if (!analysis) return;
    setLoading('fields');
    setError(null);
    try {
      const suggestions = await suggestAccountFields(
        config,
        analysis.companyName,
        analysis.industry,
        analysis.summary,
      );
      setFields(suggestions.map(fieldSuggestionToLocalField));
      setChartSizeField('size');
      setChartColorField('zone');
      setStep('fields');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  // ── Step 3 → 4: Research accounts
  async function handleResearch() {
    if (!analysis) return;
    setLoading('researching');
    setError(null);
    try {
      const enabledFields = fields.filter(f => f.enabled);
      const customFieldDefs: AccountFieldDef[] = enabledFields.map(f => ({
        id: f.id,
        key: f.key,
        name: f.name,
        type: f.type,
        unit: f.unit,
        options: f.options,
      }));
      const results = await researchPotentialAccounts(
        config,
        analysis.companyName,
        analysis.industry,
        territory,
        analysis.summary,
        customFieldDefs.length > 0 ? customFieldDefs : undefined,
      );
      setAccounts(results.map(toLocalAccount));
      setStep('accounts');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  // ── Step 4 → 5: Create template + import accounts
  function handleImport() {
    setLoading('importing');

    const enabledFields = fields.filter(f => f.enabled);
    const accountFields: AccountFieldDef[] = enabledFields.map(f => ({
      id: f.id,
      key: f.key,
      name: f.name,
      type: f.type,
      unit: f.unit,
      options: f.options,
    }));
    const chartConfig: ChartDisplayConfig = {
      sizeField: chartSizeField,
      colorField: chartColorField,
    };

    const template: Template = {
      id: generateId(),
      name: templateName.trim() || 'AI Generated Template',
      description: analysis?.summary ?? '',
      isActive: false,
      createdAt: new Date().toISOString(),
      attractivenessCriteria: attractCriteria.map(localToKAMCriterion),
      capabilityCriteria: capabCriteria.map(localToKAMCriterion),
      accountFields,
      chartConfig,
    };
    addTemplate(template);
    setCreatedTemplateId(template.id);

    const selected = accounts.filter(a => a.selected);
    for (const a of selected) {
      const accountData: Partial<Account> & { name: string; size: number; type: AccountType } = {
        name: a.name,
        size: Number(a.size) || 0,
        type: (a.type || 'hospital') as AccountType,
        strategicPriority: (a.strategicPriority || 'medium') as StrategicPriority,
        contractStatus: (a.contractStatus || 'prospect') as ContractStatus,
        ownership: a.ownership ? (a.ownership as Ownership) : undefined,
        territory: a.territory || undefined,
        beds: a.beds ? Number(a.beds) : undefined,
        notes: a.notes ? `[AI Zone: ${a.zone}] ${a.notes}` : `[AI Zone: ${a.zone}]`,
        customFields: convertCustomFields(a.customFields, enabledFields),
      };
      addAccount(accountData);
    }

    setLoading(null);
    setStep('done');
  }

  function updateAccount(idx: number, patch: Partial<LocalAccount>) {
    setAccounts(prev => prev.map(a => a.idx === idx ? { ...a, ...patch } : a));
  }

  function updateAccountCustomField(idx: number, key: string, value: string) {
    setAccounts(prev => prev.map(a =>
      a.idx === idx ? { ...a, customFields: { ...a.customFields, [key]: value } } : a,
    ));
  }

  const selectedCount = accounts.filter(a => a.selected).length;
  const enabledFields = fields.filter(f => f.enabled);
  const isWideStep = step === 'template' || step === 'accounts';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        overflowY: 'auto',
        padding: '40px 16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 16,
        width: '100%',
        maxWidth: isWideStep ? 980 : 660,
        border: '1px solid var(--color-border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        padding: '32px 36px',
        transition: 'max-width 300ms ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
              AI Template Wizard
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Analyze your company, generate a tailored KAM template, discover fields, and find top accounts.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-tertiary)', lineHeight: 1, marginLeft: 16 }}
          >
            ×
          </button>
        </div>

        <WizardProgress step={step} />

        {/* Error banner */}
        {error && (
          <div style={{
            marginBottom: 20, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(192,48,48,0.08)', border: '1px solid rgba(192,48,48,0.2)',
            fontSize: 12, color: 'var(--color-zone-red)',
          }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }}
            >
              ×
            </button>
          </div>
        )}

        {/* ═══════════════ STEP: INPUT ═══════════════ */}
        {step === 'input' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <label style={fieldLabel}>Company Website *</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://www.yourcompany.com"
                disabled={!!loading}
                autoFocus
                style={fieldInput}
              />
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 5 }}>
                Claude will analyze this URL to tailor scoring criteria to your industry.
              </p>
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={fieldLabel}>Target Market / Territory</label>
              <input
                type="text"
                value={territory}
                onChange={e => setTerritory(e.target.value)}
                placeholder="e.g. Saudi Arabia, META region, Western Europe"
                disabled={!!loading}
                style={fieldInput}
              />
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 5 }}>
                Focuses the market research step on the right geographic accounts.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} style={ghostBtn}>Cancel</button>
              <button
                onClick={handleAnalyze}
                disabled={!website.trim() || !!loading}
                style={{ ...primaryBtn, opacity: !website.trim() || !!loading ? 0.6 : 1, cursor: !website.trim() || !!loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {loading === 'analyzing' ? <><Spinner /> Analyzing website…</> : 'Analyze with Claude →'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP: TEMPLATE ═══════════════ */}
        {step === 'template' && analysis && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '10px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(108,92,231,0.05)', border: '1px solid rgba(108,92,231,0.15)',
            }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{analysis.companyName}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{analysis.industry}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {analysis.summary}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>Template Name</label>
              <input value={templateName} onChange={e => setTemplateName(e.target.value)} style={fieldInput} />
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <CriteriaPanel
                label="Opportunity Attractiveness"
                accentColor="var(--color-accent-coral)"
                criteria={attractCriteria}
                onChange={setAttractCriteria}
              />
              <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
              <CriteriaPanel
                label="Capability to Serve"
                accentColor="var(--color-accent-blue)"
                criteria={capabCriteria}
                onChange={setCapabCriteria}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => setStep('input')} style={ghostBtn}>← Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={ghostBtn}>Cancel</button>
                <button
                  onClick={handleContinueToFields}
                  disabled={!!loading}
                  style={{ ...primaryBtn, opacity: !!loading ? 0.6 : 1, cursor: !!loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {loading === 'fields' ? <><Spinner /> Discovering fields…</> : 'Continue to Fields →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP: FIELDS ═══════════════ */}
        {step === 'fields' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Claude has suggested these custom fields for <strong>{analysis?.industry}</strong> KAM analysis.
              Enable the ones you want to track, customize labels or options, then click Research Market.
            </p>

            {/* Field cards */}
            <div style={{ marginBottom: 4 }}>
              {fields.map((f, i) => (
                <FieldCard
                  key={f.id}
                  field={f}
                  onChange={updated => {
                    const next = [...fields];
                    next[i] = updated;
                    setFields(next);
                  }}
                  onDelete={() => setFields(fields.filter((_, j) => j !== i))}
                />
              ))}
              {fields.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                  No custom fields suggested — research will use standard fields only.
                </div>
              )}
            </div>

            {/* Add custom field */}
            <button
              onClick={() => setFields(prev => [...prev, {
                id: generateId(),
                key: `customField${prev.length + 1}`,
                name: 'New field',
                type: 'text',
                enabled: true,
              }])}
              style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                color: 'var(--color-interactive)', background: 'rgba(108,92,231,0.08)',
                border: '1px dashed rgba(108,92,231,0.3)', cursor: 'pointer',
                marginBottom: 4,
              }}
            >
              + Add custom field
            </button>

            {/* Chart config */}
            <ChartConfigPanel
              fields={fields}
              sizeField={chartSizeField}
              colorField={chartColorField}
              onSizeChange={setChartSizeField}
              onColorChange={setChartColorField}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 24 }}>
              <button onClick={() => setStep('template')} style={ghostBtn}>← Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={ghostBtn}>Cancel</button>
                <button
                  onClick={handleResearch}
                  disabled={!!loading}
                  style={{ ...primaryBtn, opacity: !!loading ? 0.6 : 1, cursor: !!loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {loading === 'researching' ? <><Spinner /> Researching market…</> : 'Research Market →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP: ACCOUNTS ═══════════════ */}
        {step === 'accounts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Review and edit the AI-suggested accounts. Uncheck any you don't want to import.
              </p>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0, marginLeft: 16 }}>
                {selectedCount} / {accounts.length} selected
              </span>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 24, borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    {['', 'Name', 'Size (K€)', 'Type', 'Beds', 'Territory', 'Ownership', 'Contract', 'Priority', 'Perf. Zone',
                      ...enabledFields.map(f => f.name),
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: '8px 8px', textAlign: 'left',
                          fontSize: 9, fontWeight: 700,
                          color: 'var(--color-text-tertiary)',
                          letterSpacing: '0.05em', textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr
                      key={a.idx}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        opacity: a.selected ? 1 : 0.4,
                        transition: 'opacity 120ms',
                      }}
                    >
                      <td style={{ padding: '5px 8px' }}>
                        <input
                          type="checkbox"
                          checked={a.selected}
                          onChange={e => updateAccount(a.idx, { selected: e.target.checked })}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '4px 5px', minWidth: 150 }}>
                        <input value={a.name} onChange={e => updateAccount(a.idx, { name: e.target.value })} style={tblInput} />
                      </td>
                      <td style={{ padding: '4px 5px', width: 80 }}>
                        <input type="number" value={a.size} onChange={e => updateAccount(a.idx, { size: e.target.value })} style={tblInput} />
                      </td>
                      <td style={{ padding: '4px 5px', width: 120 }}>
                        <select value={a.type} onChange={e => updateAccount(a.idx, { type: e.target.value })} style={tblSelect}>
                          {['hospital', 'clinic', 'surgical_center', 'university_hospital', 'distributor', 'gpo', 'other'].map(t => (
                            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '4px 5px', width: 70 }}>
                        <input type="number" value={a.beds} onChange={e => updateAccount(a.idx, { beds: e.target.value })} placeholder="—" style={tblInput} />
                      </td>
                      <td style={{ padding: '4px 5px', minWidth: 110 }}>
                        <input value={a.territory} onChange={e => updateAccount(a.idx, { territory: e.target.value })} style={tblInput} />
                      </td>
                      <td style={{ padding: '4px 5px', width: 90 }}>
                        <select value={a.ownership} onChange={e => updateAccount(a.idx, { ownership: e.target.value })} style={tblSelect}>
                          {['public', 'private', 'mixed'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 5px', width: 90 }}>
                        <select value={a.contractStatus} onChange={e => updateAccount(a.idx, { contractStatus: e.target.value })} style={tblSelect}>
                          {['prospect', 'active', 'expiring', 'expired', 'none'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 5px', width: 80 }}>
                        <select value={a.strategicPriority} onChange={e => updateAccount(a.idx, { strategicPriority: e.target.value })} style={tblSelect}>
                          {['high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 8px', width: 80 }}>
                        <select
                          value={a.zone}
                          onChange={e => updateAccount(a.idx, { zone: e.target.value })}
                          style={{ ...tblSelect, fontWeight: 700, color: ZONE_COLORS[a.zone] ?? 'var(--color-text-primary)' }}
                        >
                          {['green', 'yellow', 'red'].map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </td>
                      {/* Custom field columns */}
                      {enabledFields.map(f => (
                        <td key={f.key} style={{ padding: '4px 5px', minWidth: 90 }}>
                          {f.type === 'select' ? (
                            <select
                              value={a.customFields[f.key] ?? ''}
                              onChange={e => updateAccountCustomField(a.idx, f.key, e.target.value)}
                              style={tblSelect}
                            >
                              <option value="">—</option>
                              {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type={f.type === 'number' ? 'number' : 'text'}
                              value={a.customFields[f.key] ?? ''}
                              onChange={e => updateAccountCustomField(a.idx, f.key, e.target.value)}
                              placeholder="—"
                              style={tblInput}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => setStep('fields')} style={ghostBtn}>← Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={ghostBtn}>Cancel</button>
                <button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || !!loading}
                  style={{ ...primaryBtn, opacity: selectedCount === 0 || !!loading ? 0.6 : 1, cursor: selectedCount === 0 || !!loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {loading === 'importing'
                    ? <><Spinner /> Creating…</>
                    : `Create Template & Import ${selectedCount} Account${selectedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP: DONE ═══════════════ */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>✅</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10 }}>
              All done!
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>{templateName}</strong> was created with{' '}
              {attractCriteria.length + capabCriteria.length} scoring criteria
              {enabledFields.length > 0 ? ` and ${enabledFields.length} custom field${enabledFields.length !== 1 ? 's' : ''}` : ''}.
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 32 }}>
              {accounts.filter(a => a.selected).length} accounts were added to your portfolio.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={onClose} style={ghostBtn}>Close</button>
              {createdTemplateId && (
                <button
                  onClick={() => { onTemplateCreated(createdTemplateId); onClose(); }}
                  style={primaryBtn}
                >
                  Open Template Editor →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────

const microLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 700,
  color: 'var(--color-text-tertiary)',
  letterSpacing: '0.05em', textTransform: 'uppercase',
  display: 'block', marginBottom: 4,
};

const cellInput: React.CSSProperties = {
  width: '100%', padding: '6px 8px',
  borderRadius: 6, border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 11, boxSizing: 'border-box',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-secondary)',
  letterSpacing: '0.05em', textTransform: 'uppercase',
  marginBottom: 6,
};

const fieldInput: React.CSSProperties = {
  display: 'block', width: '100%',
  padding: '10px 14px', borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 14, boxSizing: 'border-box',
};

const ghostBtn: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 8,
  fontSize: 12, fontWeight: 500,
  color: 'var(--color-text-secondary)',
  background: 'transparent', border: 'none', cursor: 'pointer',
};

const primaryBtn: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 8,
  fontSize: 12, fontWeight: 600,
  color: '#fff', background: 'var(--color-interactive)',
  border: 'none', cursor: 'pointer',
};

const tblInput: React.CSSProperties = {
  width: '100%', padding: '5px 7px',
  borderRadius: 5, border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 11, boxSizing: 'border-box',
};

const tblSelect: React.CSSProperties = {
  width: '100%', padding: '5px 6px',
  borderRadius: 5, border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 11,
};
