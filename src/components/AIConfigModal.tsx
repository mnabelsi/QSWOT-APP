import { useState } from 'react';
import { CLAUDE_MODELS, testConnection } from '../lib/claude';
import { useClaudeConfig } from '../hooks/useClaudeConfig';

interface Props {
  onClose: () => void;
}

export default function AIConfigModal({ onClose }: Props) {
  const { config, update } = useClaudeConfig();
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

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
    update({ apiKey: apiKey.trim(), model });
    onClose();
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
        padding: '28px 32px',
        width: '100%',
        maxWidth: 460,
        border: '1px solid var(--color-border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
              AI Configuration
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
              Connect Claude to enable AI-powered template generation and market research.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-tertiary)', lineHeight: 1, marginLeft: 12 }}
          >
            ×
          </button>
        </div>

        {/* API Key */}
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
            Get your key at <span style={{ color: 'var(--color-interactive)' }}>console.anthropic.com</span>
          </p>
        </div>

        {/* Model */}
        <div style={{ marginBottom: 20 }}>
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
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          >
            {CLAUDE_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Test result */}
        {testStatus === 'ok' && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(74,140,28,0.08)', border: '1px solid rgba(74,140,28,0.2)',
            fontSize: 12, fontWeight: 500, color: 'var(--color-zone-green)',
          }}>
            ✓ Connected successfully
          </div>
        )}
        {testStatus === 'error' && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(192,48,48,0.08)', border: '1px solid rgba(192,48,48,0.2)',
            fontSize: 12, color: 'var(--color-zone-red)',
          }}>
            {testError}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button
            onClick={handleTest}
            disabled={!apiKey.trim() || testing}
            style={{ ...outlineBtn, opacity: !apiKey.trim() || testing ? 0.5 : 1, cursor: !apiKey.trim() || testing ? 'not-allowed' : 'pointer' }}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            style={{ ...primaryBtn, opacity: !apiKey.trim() ? 0.5 : 1, cursor: !apiKey.trim() ? 'not-allowed' : 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

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
