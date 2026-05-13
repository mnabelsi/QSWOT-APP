import { useState, useRef } from 'react';
import { CLAUDE_MODELS, DEFAULT_PROMPTS, PROMPT_TOKENS, testConnection } from '../lib/claude';
import { useClaudeConfig } from '../hooks/useClaudeConfig';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
}

type Tab = 'connection' | 'prompts';

export default function AIConfigModal({ onClose, onSaved }: Props) {
  const { config, update } = useClaudeConfig();

  const [tab, setTab] = useState<Tab>('connection');
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [analysisPrompt, setAnalysisPrompt] = useState(
    config.prompts?.websiteAnalysis?.trim() || DEFAULT_PROMPTS.websiteAnalysis,
  );
  const [fieldPrompt, setFieldPrompt] = useState(
    config.prompts?.fieldSuggestion?.trim() || DEFAULT_PROMPTS.fieldSuggestion,
  );
  const [researchPrompt, setResearchPrompt] = useState(
    config.prompts?.marketResearch?.trim() || DEFAULT_PROMPTS.marketResearch,
  );

  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const analysisRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const researchRef = useRef<HTMLTextAreaElement>(null);

  async function handleTest() {
    setTesting(true);
    setTestStatus('idle');
    try {
      await testConnection({ apiKey: apiKey.trim(), model });
      setTestStatus('ok');
    } catch (e) {
      setTestStatus('error');
      setTestError(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    update({
      apiKey: apiKey.trim(),
      model,
      prompts: {
        websiteAnalysis: analysisPrompt,
        fieldSuggestion: fieldPrompt,
        marketResearch: researchPrompt,
      },
    });
    if (onSaved) {
      onSaved();
    } else {
      onClose();
    }
  }

  function insertToken(
    ref: React.RefObject<HTMLTextAreaElement | null>,
    value: string,
    setter: (v: string) => void,
    token: string,
  ) {
    const el = ref.current;
    const start = el ? (el.selectionStart ?? value.length) : value.length;
    const end = el ? (el.selectionEnd ?? value.length) : value.length;
    const newVal = value.slice(0, start) + token + value.slice(end);
    setter(newVal);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 560,
        border: '1px solid var(--color-border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        {/* ── Header (always visible) ── */}
        <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 3 }}>
                AI Configuration
              </h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
                Connect Claude and customize the prompts used in each wizard stage.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-tertiary)', lineHeight: 1, marginLeft: 12, flexShrink: 0 }}
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--color-border)' }}>
            {(['connection', 'prompts'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px 16px',
                  fontSize: 12, fontWeight: 600,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: tab === t ? 'var(--color-interactive)' : 'var(--color-text-tertiary)',
                  borderBottom: tab === t ? '2px solid var(--color-interactive)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'all 120ms ease',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'connection' ? '🔑 Connection' : '✏️ Prompts'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content area ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

          {/* ═══ CONNECTION TAB ═══ */}
          {tab === 'connection' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setTestStatus('idle'); }}
                  placeholder="sk-ant-api03-..."
                  autoComplete="off"
                  style={{
                    display: 'block', width: '100%',
                    padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-primary)',
                    fontSize: 13, fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 5 }}>
                  Get your key at{' '}
                  <span style={{ color: 'var(--color-interactive)' }}>console.anthropic.com</span>
                </p>
              </div>

              <div style={{ marginBottom: 4 }}>
                <label style={labelStyle}>Model</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  style={{
                    display: 'block', width: '100%',
                    padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-primary)',
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                >
                  {CLAUDE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {testStatus === 'ok' && (
                <div style={{
                  marginTop: 16, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(74,140,28,0.08)', border: '1px solid rgba(74,140,28,0.2)',
                  fontSize: 12, fontWeight: 500, color: 'var(--color-zone-green)',
                }}>
                  ✓ Connected successfully
                </div>
              )}
              {testStatus === 'error' && (
                <div style={{
                  marginTop: 16, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(192,48,48,0.08)', border: '1px solid rgba(192,48,48,0.2)',
                  fontSize: 12, color: 'var(--color-zone-red)',
                }}>
                  {testError}
                </div>
              )}
            </div>
          )}

          {/* ═══ PROMPTS TAB ═══ */}
          {tab === 'prompts' && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 20, lineHeight: 1.6 }}>
                Customize what Claude is asked at each wizard stage. Click a token chip to insert it at the cursor.
              </p>

              {/* Stage 1 */}
              <PromptSection
                title="Stage 1 — Website Analysis"
                description="Analyzes your company website to generate scoring criteria."
                tokens={PROMPT_TOKENS.websiteAnalysis as unknown as { token: string; description: string }[]}
                value={analysisPrompt}
                onChange={setAnalysisPrompt}
                textareaRef={analysisRef}
                defaultValue={DEFAULT_PROMPTS.websiteAnalysis}
                onInsert={token => insertToken(analysisRef, analysisPrompt, setAnalysisPrompt, token)}
              />

              <div style={{ height: 1, background: 'var(--color-border)', margin: '20px 0' }} />

              {/* Stage 2 */}
              <PromptSection
                title="Stage 2 — Field Discovery"
                description="Discovers which custom fields are most relevant for this industry's KAM analysis."
                tokens={PROMPT_TOKENS.fieldSuggestion as unknown as { token: string; description: string }[]}
                value={fieldPrompt}
                onChange={setFieldPrompt}
                textareaRef={fieldRef}
                defaultValue={DEFAULT_PROMPTS.fieldSuggestion}
                onInsert={token => insertToken(fieldRef, fieldPrompt, setFieldPrompt, token)}
              />

              <div style={{ height: 1, background: 'var(--color-border)', margin: '20px 0' }} />

              {/* Stage 3 */}
              <PromptSection
                title="Stage 3 — Market Research"
                description="Researches top potential accounts in your target market."
                tokens={PROMPT_TOKENS.marketResearch as unknown as { token: string; description: string }[]}
                value={researchPrompt}
                onChange={setResearchPrompt}
                textareaRef={researchRef}
                defaultValue={DEFAULT_PROMPTS.marketResearch}
                onInsert={token => insertToken(researchRef, researchPrompt, setResearchPrompt, token)}
              />
            </div>
          )}
        </div>

        {/* ── Footer (always visible) ── */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          {tab === 'connection' && (
            <button
              onClick={handleTest}
              disabled={!apiKey.trim() || testing}
              style={{ ...outlineBtn, opacity: !apiKey.trim() || testing ? 0.5 : 1 }}
            >
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            style={{ ...primaryBtn, opacity: !apiKey.trim() ? 0.5 : 1 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Prompt section sub-component
// ─────────────────────────────────────────────────────────────

function PromptSection({
  title,
  description,
  tokens,
  value,
  onChange,
  textareaRef,
  defaultValue,
  onInsert,
}: {
  title: string;
  description: string;
  tokens: { token: string; description: string }[];
  value: string;
  onChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  defaultValue: string;
  onInsert: (token: string) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{description}</div>
      </div>

      {/* Token chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', alignSelf: 'center', marginRight: 2 }}>
          Tokens:
        </span>
        {tokens.map(t => (
          <button
            key={t.token}
            onClick={() => onInsert(t.token)}
            title={t.description}
            style={{
              padding: '3px 9px', borderRadius: 5,
              fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
              color: 'var(--color-interactive)',
              background: 'rgba(108,92,231,0.1)',
              border: '1px solid rgba(108,92,231,0.2)',
              cursor: 'pointer',
              transition: 'all 100ms ease',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = 'rgba(108,92,231,0.18)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'rgba(108,92,231,0.1)';
            }}
          >
            {t.token}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={11}
        spellCheck={false}
        style={{
          display: 'block', width: '100%',
          padding: '10px 12px', borderRadius: 8,
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          color: 'var(--color-text-primary)',
          fontSize: 12, lineHeight: 1.6,
          fontFamily: 'monospace',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      {/* Reset link */}
      <button
        onClick={() => onChange(defaultValue)}
        style={{
          marginTop: 5, background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: 'var(--color-text-tertiary)',
          textDecoration: 'underline', textUnderlineOffset: 2,
          padding: 0,
        }}
      >
        Reset to default
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-secondary)',
  letterSpacing: '0.05em', textTransform: 'uppercase',
  marginBottom: 6,
};

const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  fontSize: 12, fontWeight: 500,
  color: 'var(--color-text-secondary)',
  background: 'transparent', border: 'none', cursor: 'pointer',
};

const outlineBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  fontSize: 12, fontWeight: 600,
  color: 'var(--color-interactive)',
  background: 'rgba(108,92,231,0.08)', border: 'none', cursor: 'pointer',
};

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  fontSize: 12, fontWeight: 600,
  color: '#fff',
  background: 'var(--color-interactive)', border: 'none', cursor: 'pointer',
};
