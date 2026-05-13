import { useState, useEffect, useRef, useMemo } from 'react';
import { useKAMStore } from '../hooks/useKAMStore';
import { useClaudeConfig } from '../hooks/useClaudeConfig';
import {
  analyzeCompanyWebsite,
  researchPotentialAccounts,
  suggestAccountFields,
  DEFAULT_PROMPTS,
  PROMPT_TOKENS,
  type ClaudeConfig,
  type TemplateAnalysis,
  type SuggestedAccount,
  type FieldSuggestion,
} from '../lib/claude';
import type {
  Template, Criterion,
  AccountType, Ownership, ContractStatus, StrategicPriority,
  AccountFieldDef, ChartDisplayConfig,
} from '../types';
import { generateId } from '../lib/ids';

// ─────────────────────────────────────────────────────────────
// Draft persistence
// ─────────────────────────────────────────────────────────────

const DRAFT_KEY = 'kam-wizard-draft';

interface WizardDraft {
  step: WizardStep;
  website: string;
  territory: string;
  analysis: TemplateAnalysis | null;
  templateName: string;
  attractCriteria: LocalCriterion[];
  capabCriteria: LocalCriterion[];
  fields: LocalField[];
  chartSizeField: string;
  chartColorField: string;
  accounts: LocalAccount[];
  accountTypes: string[];
  sessionPrompts: SessionPrompts;
}

function loadDraft(): Partial<WizardDraft> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw) as WizardDraft;
  } catch { /* ignore */ }
  return {};
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

// ─────────────────────────────────────────────────────────────
// Local editing types
// ─────────────────────────────────────────────────────────────

type WizardStep = 'input' | 'template' | 'fields' | 'accounts' | 'done';

const STEP_KEYS: WizardStep[] = ['input', 'template', 'fields', 'accounts', 'done'];
const STEP_LABELS = ['Website', 'Template', 'Fields', 'Research', 'Done'];
const STEP_INDEX: Record<WizardStep, number> = { input: 0, template: 1, fields: 2, accounts: 3, done: 4 };

interface SessionPrompts {
  websiteAnalysis: string;
  fieldSuggestion: string;
  marketResearch: string;
}

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
  capacity: string;
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
  return { id: c.id, name: c.name, unit: c.unit, weight: c.weightPct / 100, sortOrder, benchmarks: c.benchmarks };
}

function fieldSuggestionToLocalField(f: FieldSuggestion): LocalField {
  return { id: generateId(), key: f.key, name: f.name, type: f.type, unit: f.unit, options: f.options, enabled: true };
}

function toLocalAccount(a: SuggestedAccount, idx: number): LocalAccount {
  const customFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(a.customFields ?? {})) customFields[k] = String(v);
  return {
    idx, selected: true,
    name: a.name, size: String(a.size ?? 0), type: a.type ?? 'other',
    capacity: a.capacity != null ? String(a.capacity) : '', territory: a.territory ?? '',
    ownership: a.ownership ?? 'public', contractStatus: a.contractStatus ?? 'prospect',
    strategicPriority: a.strategicPriority ?? 'medium', zone: a.zone ?? 'yellow',
    notes: a.notes ?? '', customFields,
  };
}

function convertCustomFields(raw: Record<string, string>, defs: LocalField[]): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, val] of Object.entries(raw)) {
    const def = defs.find(f => f.key === key);
    if (def?.type === 'number') { const n = Number(val); result[key] = isNaN(n) ? 0 : n; }
    else result[key] = val;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Small UI components
// ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'kam-spin 0.65s linear infinite', flexShrink: 0 }} />
  );
}

function WizardProgress({ step, maxStep, onNavigate }: {
  step: WizardStep;
  maxStep: WizardStep;
  onNavigate: (s: WizardStep) => void;
}) {
  const activeIdx = STEP_INDEX[step];
  const maxIdx = STEP_INDEX[maxStep];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 28 }}>
      {STEP_LABELS.map((label, i) => {
        const sk = STEP_KEYS[i];
        const navigable = i < maxIdx && sk !== step;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < STEP_LABELS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                onClick={() => navigable && onNavigate(sk)}
                title={navigable ? `Jump to ${label}` : undefined}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: i <= activeIdx ? 'var(--color-interactive)' : 'var(--color-border)',
                  color: i <= activeIdx ? '#fff' : 'var(--color-text-tertiary)',
                  transition: 'all 200ms ease',
                  flexShrink: 0,
                  cursor: navigable ? 'pointer' : 'default',
                  boxShadow: navigable ? '0 0 0 2px rgba(108,92,231,0.25)' : 'none',
                }}
              >
                {i < activeIdx ? '✓' : i + 1}
              </div>
              <span
                onClick={() => navigable && onNavigate(sk)}
                style={{
                  fontSize: 10, marginTop: 5, fontWeight: i === activeIdx ? 600 : 400,
                  color: i <= activeIdx ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  whiteSpace: 'nowrap', cursor: navigable ? 'pointer' : 'default',
                }}
              >
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
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Prompt editor (inline, collapsible per step)
// ─────────────────────────────────────────────────────────────

function PromptEditor({
  value,
  onChange,
  tokens,
  textareaRef,
  defaultValue,
}: {
  value: string;
  onChange: (v: string) => void;
  tokens: readonly { token: string; description: string }[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  defaultValue: string;
}) {
  function insertToken(token: string) {
    const el = textareaRef.current;
    const start = el ? (el.selectionStart ?? value.length) : value.length;
    const end = el ? (el.selectionEnd ?? value.length) : value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div style={{
      marginTop: 10, padding: '10px 12px', borderRadius: 8,
      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 2 }}>
          Tokens:
        </span>
        {tokens.map(t => (
          <button
            key={t.token}
            onClick={() => insertToken(t.token)}
            title={t.description}
            style={{
              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
              color: 'var(--color-interactive)', background: 'rgba(108,92,231,0.1)',
              border: '1px solid rgba(108,92,231,0.2)', cursor: 'pointer',
            }}
          >
            {t.token}
          </button>
        ))}
        <button
          onClick={() => onChange(defaultValue)}
          style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, padding: 0 }}
        >
          Reset to default
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={8}
        spellCheck={false}
        style={{
          display: 'block', width: '100%', padding: '8px 10px', borderRadius: 6,
          border: '1px solid var(--color-border)', background: 'var(--color-surface)',
          color: 'var(--color-text-primary)', fontSize: 11, lineHeight: 1.5,
          fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Criterion card + panel
// ─────────────────────────────────────────────────────────────

function CriterionCard({ criterion, onChange, onDelete }: { criterion: LocalCriterion; onChange: (u: LocalCriterion) => void; onDelete: () => void }) {
  const update = (patch: Partial<LocalCriterion>) => onChange({ ...criterion, ...patch });
  const updateBM = (score: number, label: string) => onChange({ ...criterion, benchmarks: criterion.benchmarks.map(b => b.score === score ? { ...b, label } : b) });
  return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 10, border: '1px solid var(--color-border)', padding: '11px 13px', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <input value={criterion.name} onChange={e => update({ name: e.target.value })} placeholder="Criterion name" style={{ ...cellInput, flex: 1, fontSize: 12, fontWeight: 600 }} />
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: '0 2px' }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={microLabel}>Unit</div>
          <input value={criterion.unit} onChange={e => update({ unit: e.target.value })} placeholder="e.g. K€/year" style={cellInput} />
        </div>
        <div style={{ width: 76 }}>
          <div style={microLabel}>Weight %</div>
          <input type="number" min={0} max={100} step={1} value={criterion.weightPct} onChange={e => update({ weightPct: Number(e.target.value) })} style={cellInput} />
        </div>
      </div>
      <div>
        <div style={{ ...microLabel, marginBottom: 5 }}>Benchmarks</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {[3, 2, 1, 0, -1].map(score => {
            const bm = criterion.benchmarks.find(b => b.score === score);
            return (
              <div key={score}>
                <div style={{ fontSize: 9, fontWeight: 700, color: score === 3 ? 'var(--color-zone-green)' : score === -1 ? 'var(--color-zone-red)' : 'var(--color-text-tertiary)', textAlign: 'center', marginBottom: 3 }}>
                  {score > 0 ? `+${score}` : score}
                </div>
                <input value={bm?.label ?? ''} onChange={e => updateBM(score, e.target.value)} placeholder="label" style={{ ...cellInput, fontSize: 10, padding: '4px 5px', textAlign: 'center' }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CriteriaPanel({ label, accentColor, criteria, onChange }: { label: string; accentColor: string; criteria: LocalCriterion[]; onChange: (u: LocalCriterion[]) => void }) {
  const total = criteria.reduce((s, c) => s + c.weightPct, 0);
  const valid = total === 100;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: valid ? 'var(--color-zone-green)' : 'var(--color-zone-red)' }}>{total}% {valid ? '✓' : `(need ${100 - total > 0 ? '+' : ''}${100 - total}%)`}</div>
        </div>
        <button onClick={() => onChange([...criteria, { id: generateId(), name: 'New criterion', unit: '', weightPct: 0, benchmarks: [3, 2, 1, 0, -1].map(score => ({ score, label: '' })) }])} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: 'var(--color-interactive)', background: 'rgba(108,92,231,0.08)', border: 'none', cursor: 'pointer' }}>+ Add</button>
      </div>
      <div style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 2 }}>
        {criteria.map((c, i) => (
          <CriterionCard key={c.id} criterion={c} onChange={updated => { const n = [...criteria]; n[i] = updated; onChange(n); }} onDelete={() => onChange(criteria.filter((_, j) => j !== i))} />
        ))}
        {criteria.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-tertiary)', fontSize: 12 }}>No criteria yet — click + Add to start.</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Field card + chart config panel
// ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = { number: '#0984e3', text: '#00b894', select: '#6c5ce7' };

function FieldCard({ field, onChange, onDelete }: { field: LocalField; onChange: (u: LocalField) => void; onDelete: () => void }) {
  const update = (patch: Partial<LocalField>) => onChange({ ...field, ...patch });
  return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 10, border: '1px solid var(--color-border)', padding: '11px 13px', marginBottom: 8, opacity: field.enabled ? 1 : 0.45, transition: 'opacity 150ms' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: field.enabled ? 10 : 0 }}>
        <input type="checkbox" checked={field.enabled} onChange={e => update({ enabled: e.target.checked })} style={{ cursor: 'pointer', width: 14, height: 14, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: TYPE_COLORS[field.type] + '20', color: TYPE_COLORS[field.type], letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>{field.type}</span>
        <input value={field.name} onChange={e => update({ name: e.target.value })} placeholder="Field name" disabled={!field.enabled} style={{ ...cellInput, flex: 1, fontSize: 12, fontWeight: 600 }} />
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-tertiary)', background: 'var(--color-border)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>{field.key}</span>
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: '0 2px' }}>×</button>
      </div>
      {field.enabled && (
        <div style={{ paddingLeft: 22 }}>
          {field.type === 'number' && <><div style={microLabel}>Unit</div><input value={field.unit ?? ''} onChange={e => update({ unit: e.target.value })} placeholder="e.g. beds, K€, visitors/mo" style={cellInput} /></>}
          {field.type === 'select' && <><div style={microLabel}>Options (comma-separated)</div><input value={(field.options ?? []).join(', ')} onChange={e => update({ options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="e.g. Small, Medium, Large" style={cellInput} /></>}
          {field.type === 'text' && <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>Free-text input field.</p>}
        </div>
      )}
    </div>
  );
}

const STD_SIZE_OPTS = [{ key: 'size', label: 'Revenue (K€)' }];
const STD_COLOR_OPTS = [
  { key: 'zone', label: 'Performance Zone' },
  { key: 'contractStatus', label: 'Contract Status' },
  { key: 'strategicPriority', label: 'Strategic Priority' },
  { key: 'type', label: 'Account Type' },
  { key: 'ownership', label: 'Ownership' },
];

function ChartConfigPanel({ fields, sizeField, colorField, onSizeChange, onColorChange }: { fields: LocalField[]; sizeField: string; colorField: string; onSizeChange: (k: string) => void; onColorChange: (k: string) => void }) {
  const numFields = fields.filter(f => f.enabled && f.type === 'number');
  const catFields = fields.filter(f => f.enabled && (f.type === 'select' || f.type === 'text'));
  return (
    <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 10, background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.15)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Portfolio Chart Configuration</div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={microLabel}>Bubble Size represents</div>
          <select value={sizeField} onChange={e => onSizeChange(e.target.value)} style={{ ...cellInput, fontSize: 12 }}>
            {STD_SIZE_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            {numFields.map(f => <option key={f.key} value={f.key}>{f.name}{f.unit ? ` (${f.unit})` : ''}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={microLabel}>Bubble Color represents</div>
          <select value={colorField} onChange={e => onColorChange(e.target.value)} style={{ ...cellInput, fontSize: 12 }}>
            {STD_COLOR_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            {catFields.map(f => <option key={f.key} value={f.key}>{f.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Zone colors
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

  // ── Restore from draft (runs once on mount)
  const draft = useMemo(loadDraft, []);

  const [step, setStep] = useState<WizardStep>(draft.step ?? 'input');
  const [maxStep, setMaxStep] = useState<WizardStep>(draft.step ?? 'input');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [website, setWebsite] = useState(draft.website ?? '');
  const [territory, setTerritory] = useState(draft.territory ?? '');
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(draft.analysis ?? null);
  const [templateName, setTemplateName] = useState(draft.templateName ?? '');
  const [attractCriteria, setAttractCriteria] = useState<LocalCriterion[]>(draft.attractCriteria ?? []);
  const [capabCriteria, setCapabCriteria] = useState<LocalCriterion[]>(draft.capabCriteria ?? []);
  const [fields, setFields] = useState<LocalField[]>(draft.fields ?? []);
  const [chartSizeField, setChartSizeField] = useState(draft.chartSizeField ?? 'size');
  const [chartColorField, setChartColorField] = useState(draft.chartColorField ?? 'zone');
  const [accounts, setAccounts] = useState<LocalAccount[]>(draft.accounts ?? []);
  const [accountTypes, setAccountTypes] = useState<string[]>(draft.accountTypes ?? []);
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);

  // ── Session-level prompts (start from config or defaults, editable per-run)
  const [sessionPrompts, setSessionPrompts] = useState<SessionPrompts>({
    websiteAnalysis: draft.sessionPrompts?.websiteAnalysis ?? (config.prompts?.websiteAnalysis?.trim() || DEFAULT_PROMPTS.websiteAnalysis),
    fieldSuggestion: draft.sessionPrompts?.fieldSuggestion ?? (config.prompts?.fieldSuggestion?.trim() || DEFAULT_PROMPTS.fieldSuggestion),
    marketResearch: draft.sessionPrompts?.marketResearch ?? (config.prompts?.marketResearch?.trim() || DEFAULT_PROMPTS.marketResearch),
  });

  // ── Prompt section visibility
  const [openPrompt, setOpenPrompt] = useState<'analysis' | 'fields' | 'research' | null>(null);
  const analysisPromptRef = useRef<HTMLTextAreaElement>(null);
  const fieldPromptRef = useRef<HTMLTextAreaElement>(null);
  const researchPromptRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-save draft
  useEffect(() => {
    if (step === 'done') { clearDraft(); return; }
    const d: WizardDraft = { step, website, territory, analysis, templateName, attractCriteria, capabCriteria, fields, chartSizeField, chartColorField, accounts, accountTypes, sessionPrompts };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  }, [step, website, territory, analysis, templateName, attractCriteria, capabCriteria, fields, chartSizeField, chartColorField, accounts, sessionPrompts]);

  // ── Navigation helpers
  function advanceTo(target: WizardStep) {
    setStep(target);
    if (STEP_INDEX[target] > STEP_INDEX[maxStep]) setMaxStep(target);
  }

  function navigateTo(target: WizardStep) {
    if (STEP_INDEX[target] <= STEP_INDEX[maxStep]) setStep(target);
  }

  function startOver() {
    clearDraft();
    setStep('input'); setMaxStep('input');
    setWebsite(''); setTerritory('');
    setAnalysis(null); setTemplateName('');
    setAttractCriteria([]); setCapabCriteria([]);
    setFields([]); setChartSizeField('size'); setChartColorField('zone');
    setAccounts([]); setAccountTypes([]); setCreatedTemplateId(null);
    setError(null); setOpenPrompt(null);
    setSessionPrompts({
      websiteAnalysis: config.prompts?.websiteAnalysis?.trim() || DEFAULT_PROMPTS.websiteAnalysis,
      fieldSuggestion: config.prompts?.fieldSuggestion?.trim() || DEFAULT_PROMPTS.fieldSuggestion,
      marketResearch: config.prompts?.marketResearch?.trim() || DEFAULT_PROMPTS.marketResearch,
    });
  }

  // Builds a config with session-level prompt overrides
  function sessionConfig(): ClaudeConfig {
    return { ...config, prompts: sessionPrompts };
  }

  // ── Step 1 → 2: Analyze website
  async function handleAnalyze(force = false) {
    if (!website.trim()) return;
    if (!force && analysis !== null) { advanceTo('template'); return; }
    setLoading('analyzing'); setError(null);
    try {
      const result = await analyzeCompanyWebsite(sessionConfig(), website.trim());
      setAnalysis(result);
      setTemplateName(`${result.companyName} KAM Template`);
      setAttractCriteria(result.attractivenessCriteria.map(toLocalCriterion));
      setCapabCriteria(result.capabilityCriteria.map(toLocalCriterion));
      setAccountTypes(result.accountTypes ?? []);
      advanceTo('template');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(null); }
  }

  // ── Step 2 → 3: Discover fields
  async function handleContinueToFields(force = false) {
    if (!analysis) return;
    if (!force && fields.length > 0) { advanceTo('fields'); return; }
    setLoading('fields'); setError(null);
    try {
      const suggestions = await suggestAccountFields(sessionConfig(), analysis.companyName, analysis.industry, analysis.summary);
      setFields(suggestions.map(fieldSuggestionToLocalField));
      setChartSizeField('size'); setChartColorField('zone');
      advanceTo('fields');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(null); }
  }

  // ── Step 3 → 4: Research accounts
  async function handleResearch(force = false) {
    if (!analysis) return;
    if (!force && accounts.length > 0) { advanceTo('accounts'); return; }
    setLoading('researching'); setError(null);
    try {
      const enabled = fields.filter(f => f.enabled);
      const defs: AccountFieldDef[] = enabled.map(f => ({ id: f.id, key: f.key, name: f.name, type: f.type, unit: f.unit, options: f.options }));
      const results = await researchPotentialAccounts(sessionConfig(), analysis.companyName, analysis.industry, territory, analysis.summary, defs.length > 0 ? defs : undefined, accountTypes.length > 0 ? accountTypes : undefined);
      setAccounts(results.map(toLocalAccount));
      advanceTo('accounts');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(null); }
  }

  // ── Step 4 → 5: Create template + import accounts
  function handleImport() {
    setLoading('importing');
    const enabled = fields.filter(f => f.enabled);
    const accountFields: AccountFieldDef[] = enabled.map(f => ({ id: f.id, key: f.key, name: f.name, type: f.type, unit: f.unit, options: f.options }));
    const chartConfig: ChartDisplayConfig = { sizeField: chartSizeField, colorField: chartColorField };
    const template: Template = {
      id: generateId(), name: templateName.trim() || 'AI Generated Template',
      description: analysis?.summary ?? '', isActive: false, createdAt: new Date().toISOString(),
      attractivenessCriteria: attractCriteria.map(localToKAMCriterion),
      capabilityCriteria: capabCriteria.map(localToKAMCriterion),
      accountFields, chartConfig,
      accountTypes: accountTypes.length > 0 ? accountTypes : undefined,
    };
    addTemplate(template);
    setCreatedTemplateId(template.id);
    for (const a of accounts.filter(a => a.selected)) {
      addAccount({
        name: a.name, size: Number(a.size) || 0, type: (a.type || 'hospital') as AccountType,
        strategicPriority: (a.strategicPriority || 'medium') as StrategicPriority,
        contractStatus: (a.contractStatus || 'prospect') as ContractStatus,
        ownership: a.ownership ? (a.ownership as Ownership) : undefined,
        territory: a.territory || undefined, beds: a.capacity ? Number(a.capacity) : undefined,
        notes: a.notes ? `[AI Zone: ${a.zone}] ${a.notes}` : `[AI Zone: ${a.zone}]`,
        customFields: convertCustomFields(a.customFields, enabled),
      });
    }
    setLoading(null);
    clearDraft();
    advanceTo('done');
  }

  function updateAccount(idx: number, patch: Partial<LocalAccount>) {
    setAccounts(prev => prev.map(a => a.idx === idx ? { ...a, ...patch } : a));
  }
  function updateAccountCF(idx: number, key: string, value: string) {
    setAccounts(prev => prev.map(a => a.idx === idx ? { ...a, customFields: { ...a.customFields, [key]: value } } : a));
  }

  const selectedCount = accounts.filter(a => a.selected).length;
  const enabledFields = fields.filter(f => f.enabled);
  const hasDraft = STEP_INDEX[maxStep] > 0;
  const isWideStep = step === 'template' || step === 'accounts';

  // ── Prompt toggle helper
  function togglePrompt(key: typeof openPrompt) {
    setOpenPrompt(prev => prev === key ? null : key);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', overflowY: 'auto', padding: '40px 16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, width: '100%', maxWidth: isWideStep ? 980 : 660, border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: '32px 36px', transition: 'max-width 300ms ease' }}>

        {/* ── Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>AI Template Wizard</h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Analyze your company, generate a KAM template, discover fields, and find top accounts.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
            {hasDraft && (
              <span style={{ fontSize: 10, color: 'var(--color-zone-green)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-zone-green)', display: 'inline-block' }} />
                Draft saved
              </span>
            )}
            {step !== 'input' && (
              <button onClick={startOver} style={{ fontSize: 11, color: 'var(--color-text-tertiary)', background: 'none', border: '1px solid var(--color-border)', cursor: 'pointer', padding: '3px 8px', borderRadius: 5 }}>
                Start over
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-tertiary)', lineHeight: 1 }}>×</button>
          </div>
        </div>

        <WizardProgress step={step} maxStep={maxStep} onNavigate={navigateTo} />

        {/* ── Error banner */}
        {error && (
          <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8, background: 'rgba(192,48,48,0.08)', border: '1px solid rgba(192,48,48,0.2)', fontSize: 12, color: 'var(--color-zone-red)' }}>
            {error}
            <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }}>×</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP: INPUT
        ══════════════════════════════════════════════════════════ */}
        {step === 'input' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <label style={fieldLabel}>Company Website *</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAnalyze()} placeholder="https://www.yourcompany.com" disabled={!!loading} autoFocus style={fieldInput} />
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 5 }}>Claude will analyze this URL to tailor scoring criteria to your industry.</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>Target Market / Territory</label>
              <input type="text" value={territory} onChange={e => setTerritory(e.target.value)} placeholder="e.g. Saudi Arabia, META region, Western Europe" disabled={!!loading} style={fieldInput} />
            </div>

            {/* Inline prompt editor */}
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => togglePrompt('analysis')} style={promptToggleStyle}>
                <span style={{ fontSize: 8, display: 'inline-block', transform: openPrompt === 'analysis' ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>▶</span>
                {' '}{openPrompt === 'analysis' ? 'Hide' : 'Edit'} AI prompt for website analysis
              </button>
              {openPrompt === 'analysis' && (
                <PromptEditor
                  value={sessionPrompts.websiteAnalysis}
                  onChange={v => setSessionPrompts(p => ({ ...p, websiteAnalysis: v }))}
                  tokens={PROMPT_TOKENS.websiteAnalysis}
                  textareaRef={analysisPromptRef}
                  defaultValue={DEFAULT_PROMPTS.websiteAnalysis}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} style={ghostBtn}>Cancel</button>
              {analysis && (
                <button onClick={() => handleAnalyze(true)} disabled={!!loading} style={{ ...outlineBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {loading === 'analyzing' ? <><Spinner /> Re-analyzing…</> : '↻ Re-analyze'}
                </button>
              )}
              <button onClick={() => handleAnalyze()} disabled={!website.trim() || !!loading} style={{ ...primaryBtn, opacity: !website.trim() || !!loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {loading === 'analyzing' ? <><Spinner /> Analyzing…</> : analysis ? 'Continue →' : 'Analyze with Claude →'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP: TEMPLATE
        ══════════════════════════════════════════════════════════ */}
        {step === 'template' && analysis && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', borderRadius: 8, marginBottom: 20, background: 'rgba(108,92,231,0.05)', border: '1px solid rgba(108,92,231,0.15)' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{analysis.companyName}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{analysis.industry}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{analysis.summary}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>Template Name</label>
              <input value={templateName} onChange={e => setTemplateName(e.target.value)} style={fieldInput} />
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <CriteriaPanel label="Opportunity Attractiveness" accentColor="var(--color-accent-coral)" criteria={attractCriteria} onChange={setAttractCriteria} />
              <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
              <CriteriaPanel label="Capability to Serve" accentColor="var(--color-accent-blue)" criteria={capabCriteria} onChange={setCapabCriteria} />
            </div>

            {/* Inline prompt editor for field discovery */}
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => togglePrompt('fields')} style={promptToggleStyle}>
                <span style={{ fontSize: 8, display: 'inline-block', transform: openPrompt === 'fields' ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>▶</span>
                {' '}{openPrompt === 'fields' ? 'Hide' : 'Edit'} AI prompt for field discovery
              </button>
              {openPrompt === 'fields' && (
                <PromptEditor
                  value={sessionPrompts.fieldSuggestion}
                  onChange={v => setSessionPrompts(p => ({ ...p, fieldSuggestion: v }))}
                  tokens={PROMPT_TOKENS.fieldSuggestion}
                  textareaRef={fieldPromptRef}
                  defaultValue={DEFAULT_PROMPTS.fieldSuggestion}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => setStep('input')} style={ghostBtn}>← Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={ghostBtn}>Cancel</button>
                {fields.length > 0 && (
                  <button onClick={() => handleContinueToFields(true)} disabled={!!loading} style={{ ...outlineBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {loading === 'fields' ? <><Spinner /> Regenerating…</> : '↻ Regenerate Fields'}
                  </button>
                )}
                <button onClick={() => handleContinueToFields()} disabled={!!loading} style={{ ...primaryBtn, opacity: !!loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {loading === 'fields' ? <><Spinner /> Discovering fields…</> : fields.length > 0 ? 'Continue to Fields →' : 'Discover Fields with Claude →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP: FIELDS
        ══════════════════════════════════════════════════════════ */}
        {step === 'fields' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Claude has suggested these custom fields for <strong>{analysis?.industry}</strong> KAM analysis. Enable the ones you want, customize labels or options, then research accounts.
            </p>

            <div style={{ marginBottom: 4 }}>
              {fields.map((f, i) => (
                <FieldCard key={f.id} field={f} onChange={updated => { const n = [...fields]; n[i] = updated; setFields(n); }} onDelete={() => setFields(fields.filter((_, j) => j !== i))} />
              ))}
              {fields.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-tertiary)', fontSize: 12 }}>No custom fields — research will use standard fields only.</div>}
            </div>

            <button
              onClick={() => setFields(prev => [...prev, { id: generateId(), key: `customField${prev.length + 1}`, name: 'New field', type: 'text', enabled: true }])}
              style={{ padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600, color: 'var(--color-interactive)', background: 'rgba(108,92,231,0.08)', border: '1px dashed rgba(108,92,231,0.3)', cursor: 'pointer', marginBottom: 4 }}
            >
              + Add custom field
            </button>

            <ChartConfigPanel fields={fields} sizeField={chartSizeField} colorField={chartColorField} onSizeChange={setChartSizeField} onColorChange={setChartColorField} />

            {/* Inline prompt editor for market research */}
            <div style={{ marginTop: 20, marginBottom: 4 }}>
              <button onClick={() => togglePrompt('research')} style={promptToggleStyle}>
                <span style={{ fontSize: 8, display: 'inline-block', transform: openPrompt === 'research' ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>▶</span>
                {' '}{openPrompt === 'research' ? 'Hide' : 'Edit'} AI prompt for market research
              </button>
              {openPrompt === 'research' && (
                <PromptEditor
                  value={sessionPrompts.marketResearch}
                  onChange={v => setSessionPrompts(p => ({ ...p, marketResearch: v }))}
                  tokens={PROMPT_TOKENS.marketResearch}
                  textareaRef={researchPromptRef}
                  defaultValue={DEFAULT_PROMPTS.marketResearch}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 20 }}>
              <button onClick={() => setStep('template')} style={ghostBtn}>← Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={ghostBtn}>Cancel</button>
                {accounts.length > 0 && (
                  <button onClick={() => handleResearch(true)} disabled={!!loading} style={{ ...outlineBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {loading === 'researching' ? <><Spinner /> Researching…</> : '↻ Re-research Market'}
                  </button>
                )}
                <button onClick={() => handleResearch()} disabled={!!loading} style={{ ...primaryBtn, opacity: !!loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {loading === 'researching' ? <><Spinner /> Researching market…</> : accounts.length > 0 ? 'Continue to Accounts →' : 'Research Market →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP: ACCOUNTS
        ══════════════════════════════════════════════════════════ */}
        {step === 'accounts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Review and edit AI-suggested accounts. Uncheck any to skip.</p>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0, marginLeft: 16 }}>{selectedCount} / {accounts.length} selected</span>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 24, borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    {['', 'Name', 'Size (K€)', 'Type', 'Capacity', 'Territory', 'Ownership', 'Contract', 'Priority', 'Zone', ...enabledFields.map(f => f.name)].map((h, i) => (
                      <th key={i} style={{ padding: '8px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.idx} style={{ borderBottom: '1px solid var(--color-border)', opacity: a.selected ? 1 : 0.4, transition: 'opacity 120ms' }}>
                      <td style={{ padding: '5px 8px' }}><input type="checkbox" checked={a.selected} onChange={e => updateAccount(a.idx, { selected: e.target.checked })} style={{ cursor: 'pointer' }} /></td>
                      <td style={{ padding: '4px 5px', minWidth: 150 }}><input value={a.name} onChange={e => updateAccount(a.idx, { name: e.target.value })} style={tblInput} /></td>
                      <td style={{ padding: '4px 5px', width: 80 }}><input type="number" value={a.size} onChange={e => updateAccount(a.idx, { size: e.target.value })} style={tblInput} /></td>
                      <td style={{ padding: '4px 5px', width: 120 }}>
                        <select value={a.type} onChange={e => updateAccount(a.idx, { type: e.target.value })} style={tblSelect}>
                          {(accountTypes.length > 0 ? accountTypes : ['enterprise', 'organization', 'distributor', 'partner', 'other']).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 5px', width: 70 }}><input type="number" value={a.capacity} onChange={e => updateAccount(a.idx, { capacity: e.target.value })} placeholder="—" style={tblInput} /></td>
                      <td style={{ padding: '4px 5px', minWidth: 110 }}><input value={a.territory} onChange={e => updateAccount(a.idx, { territory: e.target.value })} style={tblInput} /></td>
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
                        <select value={a.zone} onChange={e => updateAccount(a.idx, { zone: e.target.value })} style={{ ...tblSelect, fontWeight: 700, color: ZONE_COLORS[a.zone] ?? 'var(--color-text-primary)' }}>
                          {['green', 'yellow', 'red'].map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </td>
                      {enabledFields.map(f => (
                        <td key={f.key} style={{ padding: '4px 5px', minWidth: 90 }}>
                          {f.type === 'select' ? (
                            <select value={a.customFields[f.key] ?? ''} onChange={e => updateAccountCF(a.idx, f.key, e.target.value)} style={tblSelect}>
                              <option value="">—</option>
                              {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input type={f.type === 'number' ? 'number' : 'text'} value={a.customFields[f.key] ?? ''} onChange={e => updateAccountCF(a.idx, f.key, e.target.value)} placeholder="—" style={tblInput} />
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
                <button onClick={handleImport} disabled={selectedCount === 0 || !!loading} style={{ ...primaryBtn, opacity: selectedCount === 0 || !!loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {loading === 'importing' ? <><Spinner /> Creating…</> : `Create Template & Import ${selectedCount} Account${selectedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP: DONE
        ══════════════════════════════════════════════════════════ */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>✅</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10 }}>All done!</h3>
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
                <button onClick={() => { onTemplateCreated(createdTemplateId); onClose(); }} style={primaryBtn}>Open Template Editor →</button>
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
  fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)',
  letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4,
};

const cellInput: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border)',
  background: 'var(--color-surface)', color: 'var(--color-text-primary)',
  fontSize: 11, boxSizing: 'border-box',
};

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)',
  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6,
};

const fieldInput: React.CSSProperties = {
  display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid var(--color-border)', background: 'var(--color-bg)',
  color: 'var(--color-text-primary)', fontSize: 14, boxSizing: 'border-box',
};

const ghostBtn: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 500,
  color: 'var(--color-text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer',
};

const primaryBtn: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  color: '#fff', background: 'var(--color-interactive)', border: 'none', cursor: 'pointer',
};

const outlineBtn: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  color: 'var(--color-interactive)', background: 'rgba(108,92,231,0.08)', border: 'none', cursor: 'pointer',
};

const tblInput: React.CSSProperties = {
  width: '100%', padding: '5px 7px', borderRadius: 5, border: '1px solid var(--color-border)',
  background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: 11, boxSizing: 'border-box',
};

const tblSelect: React.CSSProperties = {
  width: '100%', padding: '5px 6px', borderRadius: 5, border: '1px solid var(--color-border)',
  background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: 11,
};

const promptToggleStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--color-interactive)', background: 'none', border: 'none',
  cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500,
};
