import { useState } from 'react';
import { useKAMStore } from '../hooks/useKAMStore';
import { useClaudeConfig } from '../hooks/useClaudeConfig';
import TemplateEditor from './TemplateEditor';
import ConfirmDialog from './ConfirmDialog';
import AIConfigModal from './AIConfigModal';
import TemplateWizard from './TemplateWizard';
import { generateId } from '../lib/ids';
import type { Template } from '../types';

export default function TemplatesScreen() {
  const {
    templates, deleteTemplate, setActiveTemplate,
    duplicateTemplate, addTemplate, resetAllData,
  } = useKAMStore();
  const { isConfigured } = useClaudeConfig();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [configFromWizard, setConfigFromWizard] = useState(false);

  const editingTemplate = templates.find(t => t.id === editingId);

  if (editingTemplate) {
    return (
      <div style={{ padding: '16px 20px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <TemplateEditor template={editingTemplate} onClose={() => setEditingId(null)} />
      </div>
    );
  }

  const handleCreateBlank = () => {
    const newTemplate: Template = {
      id: generateId(),
      name: 'New Template',
      description: 'Custom scoring template',
      isActive: false,
      createdAt: new Date().toISOString(),
      attractivenessCriteria: [],
      capabilityCriteria: [],
    };
    addTemplate(newTemplate);
    setEditingId(newTemplate.id);
  };

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Templates</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Configure scoring criteria and weights for your portfolio
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowAIConfig(true)}
            title="Configure Claude AI"
            style={{
              padding: '7px 10px', borderRadius: 8,
              fontSize: 13, fontWeight: 500,
              color: isConfigured ? 'var(--color-interactive)' : 'var(--color-text-tertiary)',
              background: isConfigured ? 'rgba(108,92,231,0.08)' : 'var(--color-bg)',
              border: '1px solid var(--color-border)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ fontSize: 14 }}>⚙</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>AI Config{isConfigured ? ' ✓' : ''}</span>
          </button>
          <button
            onClick={() => {
              if (isConfigured) {
                setShowWizard(true);
              } else {
                setConfigFromWizard(true);
                setShowAIConfig(true);
              }
            }}
            style={{
              padding: '8px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>✦</span> AI Wizard
          </button>
          <button
            onClick={handleCreateBlank}
            style={{
              padding: '8px 16px', borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              color: '#ffffff', background: 'var(--color-interactive)',
              border: 'none', cursor: 'pointer',
            }}
          >
            + Create template
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
        {templates.map(template => {
          const isActive = template.isActive;
          const isDefault = template.id === 'default-meta-template';
          const aCriteria = template.attractivenessCriteria.length;
          const cCriteria = template.capabilityCriteria.length;

          return (
            <div
              key={template.id}
              style={{
                background: 'var(--color-surface)',
                border: isActive ? '2px solid var(--color-interactive)' : '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '18px 20px',
                transition: 'all 150ms ease-out',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
                      {template.name}
                    </h3>
                    {isDefault && (
                      <span style={{
                        fontSize: 9, fontWeight: 600, color: 'var(--color-text-tertiary)',
                        background: 'var(--color-bg)', padding: '1px 6px', borderRadius: 3,
                      }}>
                        Default
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4, marginBottom: 8 }}>
                    {template.description}
                  </p>
                </div>
                {isActive && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--color-interactive)',
                    background: 'rgba(108,92,231,0.08)', padding: '2px 7px',
                    borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}>
                    Active
                  </span>
                )}
              </div>

              {/* Criteria stats */}
              <div style={{
                display: 'flex', gap: 12, marginBottom: 12, padding: '8px 10px',
                background: 'var(--color-bg)', borderRadius: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-accent-coral)', letterSpacing: '0.06em', marginBottom: 2 }}>
                    ATTRACTIVENESS
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {aCriteria} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>criteria</span>
                  </div>
                </div>
                <div style={{ width: 1, background: 'var(--color-border)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-accent-blue)', letterSpacing: '0.06em', marginBottom: 2 }}>
                    CAPABILITY
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {cCriteria} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>criteria</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setEditingId(template.id)}
                  style={{
                    padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    color: 'var(--color-interactive)', background: 'rgba(108,92,231,0.06)',
                    border: 'none', cursor: 'pointer', transition: 'all 100ms ease-out',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => duplicateTemplate(template.id)}
                  style={{
                    padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    color: 'var(--color-text-secondary)', background: 'var(--color-bg)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  Duplicate
                </button>
                {!isActive && (
                  <button
                    onClick={() => setActiveTemplate(template.id)}
                    style={{
                      padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      color: 'var(--color-zone-green)', background: 'rgba(74,140,28,0.06)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Activate
                  </button>
                )}
                {!isDefault && (
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    style={{
                      padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      color: 'var(--color-zone-red)', background: 'rgba(192,48,48,0.04)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset footer */}
      <div style={{
        marginTop: 32, paddingTop: 16,
        borderTop: '1px solid var(--color-border)',
        display: 'flex', justifyContent: 'center',
      }}>
        <button
          onClick={() => setShowResetDialog(true)}
          style={{
            padding: '6px 14px', borderRadius: 6,
            fontSize: 11, fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            background: 'transparent', border: 'none',
            cursor: 'pointer', textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          Reset all data
        </button>
      </div>

      <ConfirmDialog
        open={showResetDialog}
        title="Reset All Data"
        message='This will delete all accounts, scores, and custom templates. The default META template will be restored. Type "RESET" to confirm.'
        confirmLabel="Reset everything"
        requireTyped="RESET"
        onConfirm={() => { resetAllData(); setShowResetDialog(false); }}
        onCancel={() => setShowResetDialog(false)}
        danger
      />

      {showAIConfig && (
        <AIConfigModal
          onClose={() => { setShowAIConfig(false); setConfigFromWizard(false); }}
          onSaved={configFromWizard ? () => {
            setShowAIConfig(false);
            setConfigFromWizard(false);
            setShowWizard(true);
          } : undefined}
        />
      )}

      {showWizard && (
        <TemplateWizard
          onClose={() => setShowWizard(false)}
          onTemplateCreated={(id) => {
            setShowWizard(false);
            setEditingId(id);
          }}
        />
      )}
    </div>
  );
}
