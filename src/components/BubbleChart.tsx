import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { EnrichedAccount } from '../types';
import { useKAMStore } from '../hooks/useKAMStore';
import { isStale } from '../lib/scoring';
import { formatCurrency } from '../lib/currency';

const PADDING = { top: 30, right: 50, bottom: 50, left: 55 };

const cellColors: string[][] = [
  ['#f5dbd8', '#fef3cd', '#d4edca'],
  ['#fbe0dc', '#fef8e0', '#e4f0de'],
  ['#f0cbcb', '#fbe0dc', '#fef3cd'],
];

const zoneLabels = [
  { text: 'Protect', x: 2, y: 0, color: '#3a7014' },
  { text: 'Invest', x: 1, y: 0, color: '#6a8c30' },
  { text: 'Maintain', x: 2, y: 1, color: '#6a8c30' },
  { text: 'Review', x: 0, y: 1, color: '#a07008' },
  { text: 'Review', x: 1, y: 1, color: '#a07008' },
  { text: 'Monitor', x: 1, y: 2, color: '#a06040' },
  { text: 'Exit', x: 0, y: 2, color: '#a02020' },
  { text: 'Divest', x: 0, y: 0, color: '#a04040' },
  { text: 'Harvest', x: 2, y: 2, color: '#a06040' },
];

// ─────────────────────────────────────────────────────────────
// Color logic
// ─────────────────────────────────────────────────────────────

const FIXED_COLOR_MAPS: Record<string, Record<string, string>> = {
  zone: { green: '#4a8c1c', yellow: '#c48a0a', red: '#c03030' },
  contractStatus: { active: '#00b894', expiring: '#fdcb6e', expired: '#e17055', prospect: '#6c5ce7', none: '#b2bec3' },
  strategicPriority: { high: '#d63031', medium: '#e17055', low: '#74b9ff' },
  ownership: { public: '#0984e3', private: '#6c5ce7', mixed: '#00b894' },
  type: {
    hospital: '#0984e3', clinic: '#00b894', surgical_center: '#6c5ce7',
    university_hospital: '#e17055', distributor: '#fdcb6e', gpo: '#fd79a8', other: '#b2bec3',
  },
};

const PALETTE = ['#6c5ce7', '#0984e3', '#00b894', '#e17055', '#fdcb6e', '#e84393', '#a29bfe', '#55efc4'];

function getColorFieldValue(account: EnrichedAccount, field: string): string {
  if (field === 'zone') return account.zone ?? '';
  if (field === 'contractStatus') return account.contractStatus ?? '';
  if (field === 'strategicPriority') return account.strategicPriority ?? '';
  if (field === 'type') return account.type ?? '';
  if (field === 'ownership') return account.ownership ?? '';
  return String(account.customFields?.[field] ?? '');
}

function getAccountColor(account: EnrichedAccount, field: string, distinctValues: string[]): string {
  const fixedMap = FIXED_COLOR_MAPS[field];
  if (fixedMap) {
    const val = getColorFieldValue(account, field);
    return fixedMap[val] ?? '#b2bec3';
  }
  const val = getColorFieldValue(account, field);
  const idx = distinctValues.indexOf(val);
  return idx >= 0 ? PALETTE[idx % PALETTE.length] : '#b2bec3';
}

function getAccountSizeValue(account: EnrichedAccount, field: string): number {
  if (field === 'size') return account.size;
  if (field === 'beds') return account.beds ?? 0;
  const cv = account.customFields?.[field];
  if (typeof cv === 'number') return cv;
  if (typeof cv === 'string') return parseFloat(cv) || 0;
  return 0;
}

function getSizeFieldLabel(field: string, template: { accountFields?: { key: string; name: string; unit?: string }[] }): string {
  if (field === 'size') return 'Revenue';
  const def = template.accountFields?.find(f => f.key === field);
  if (def) return `${def.name}${def.unit ? ` (${def.unit})` : ''}`;
  return field;
}

// ─────────────────────────────────────────────────────────────

interface TooltipData {
  account: EnrichedAccount;
  svgX: number;
  svgY: number;
}

const DEFAULT_CHART_CONFIG = { sizeField: 'size', colorField: 'zone' };

export default function BubbleChart({ onBubbleClick }: { onBubbleClick: (id: string) => void }) {
  const { enrichedAccounts, activeTemplate } = useKAMStore();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const chartConfig = activeTemplate.chartConfig ?? DEFAULT_CHART_CONFIG;
  const { sizeField, colorField } = chartConfig;

  const viewWidth = 700;
  const viewHeight = 380;
  const plotW = viewWidth - PADDING.left - PADDING.right;
  const plotH = viewHeight - PADDING.top - PADDING.bottom;

  const minScore = -100;
  const maxScore = 300;
  const scoreRange = maxScore - minScore;

  const scored = enrichedAccounts.filter(a => a.scoredCount > 0);
  const unscored = enrichedAccounts.filter(a => a.scoredCount === 0);
  const parkingLotHeight = unscored.length > 0 ? 55 : 0;
  const totalHeight = viewHeight + parkingLotHeight;

  // Collect distinct color field values for palette assignment
  const distinctColorValues = useMemo(() => {
    const vals = new Set<string>();
    for (const acc of enrichedAccounts) {
      const val = getColorFieldValue(acc, colorField);
      if (val) vals.add(val);
    }
    return Array.from(vals).sort();
  }, [enrichedAccounts, colorField]);

  const scaleX = (val: number) => {
    const clamped = Math.max(minScore, Math.min(maxScore, val));
    return PADDING.left + ((clamped - minScore) / scoreRange) * plotW;
  };

  const scaleY = (val: number) => {
    const clamped = Math.max(minScore, Math.min(maxScore, val));
    return PADDING.top + plotH - ((clamped - minScore) / scoreRange) * plotH;
  };

  const getBubbleRadius = (account: EnrichedAccount) => {
    const minR = 6;
    const maxR = 45;
    const sizes = enrichedAccounts.map(a => getAccountSizeValue(a, sizeField)).filter(s => !isNaN(s));
    if (sizes.length === 0) return minR;
    const maxSize = Math.max(...sizes, 1);
    const minSize = Math.min(...sizes, 0);
    if (maxSize === minSize) return (minR + maxR) / 2;
    const val = getAccountSizeValue(account, sizeField);
    const sqrtMin = Math.sqrt(minSize);
    const sqrtMax = Math.sqrt(maxSize);
    const sqrtVal = Math.sqrt(Math.max(0, val));
    const normalized = (sqrtVal - sqrtMin) / (sqrtMax - sqrtMin);
    return isNaN(normalized) ? minR : minR + normalized * (maxR - minR);
  };

  // Legend items
  const legendItems = useMemo(() => {
    const fixedMap = FIXED_COLOR_MAPS[colorField];
    if (fixedMap) {
      return distinctColorValues
        .filter(v => fixedMap[v])
        .map(v => ({ label: v.replace(/_/g, ' '), color: fixedMap[v] }));
    }
    return distinctColorValues.map((v, i) => ({
      label: v.replace(/_/g, ' '),
      color: PALETTE[i % PALETTE.length],
    }));
  }, [colorField, distinctColorValues]);

  const sizeLabel = getSizeFieldLabel(sizeField, activeTemplate);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      {/* Legend */}
      <div style={{
        position: 'absolute', top: 12, right: 16, zIndex: 10,
        display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 10, fontWeight: 600,
        background: 'var(--color-surface)', padding: '6px 10px',
        borderRadius: 8, border: '1px solid var(--color-border)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        maxWidth: 220,
      }}>
        {legendItems.slice(0, 7).map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: item.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{item.label}</span>
          </div>
        ))}
        {legendItems.length === 0 && (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10 }}>No data</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${viewWidth} ${totalHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* 9-cell grid */}
        {[0, 1, 2].map(row =>
          [0, 1, 2].map(col => {
            const cellW = plotW / 3;
            const cellH = plotH / 3;
            return (
              <rect
                key={`cell-${row}-${col}`}
                x={PADDING.left + col * cellW}
                y={PADDING.top + row * cellH}
                width={cellW}
                height={cellH}
                fill={cellColors[row][col]}
                rx={row === 0 && col === 0 ? 4 : row === 0 && col === 2 ? 4 : row === 2 && col === 0 ? 4 : row === 2 && col === 2 ? 4 : 0}
              />
            );
          })
        )}

        {/* Zone strategy labels */}
        {zoneLabels.map((zl, i) => {
          const cellW = plotW / 3;
          const cellH = plotH / 3;
          return (
            <text
              key={i}
              x={PADDING.left + zl.x * cellW + cellW / 2}
              y={PADDING.top + zl.y * cellH + cellH - 8}
              textAnchor="middle"
              fontSize={9} fontWeight={600}
              fill={zl.color}
              fontFamily="var(--font-family-sans)"
              opacity={0.5}
              letterSpacing="0.06em"
              style={{ textTransform: 'uppercase' }}
            >
              {zl.text.toUpperCase()}
            </text>
          );
        })}

        {/* Grid lines */}
        {[0, 100, 200].map(val => (
          <g key={`grid-${val}`}>
            <line
              x1={scaleX(val)} y1={PADDING.top} x2={scaleX(val)} y2={PADDING.top + plotH}
              stroke="rgba(0,0,0,0.06)" strokeWidth={1}
            />
            <text x={scaleX(val)} y={PADDING.top + plotH + 14} textAnchor="middle"
              fontSize={9} fill="var(--color-text-tertiary)" fontFamily="var(--font-family-sans)" fontWeight={500}>
              {val}
            </text>
            <line
              x1={PADDING.left} y1={scaleY(val)} x2={PADDING.left + plotW} y2={scaleY(val)}
              stroke="rgba(0,0,0,0.06)" strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={scaleY(val) + 3} textAnchor="end"
              fontSize={9} fill="var(--color-text-tertiary)" fontFamily="var(--font-family-sans)" fontWeight={500}>
              {val}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={PADDING.left + plotW / 2} y={PADDING.top + plotH + 36}
          textAnchor="middle" fontSize={11} fontWeight={600}
          fill="var(--color-accent-coral)" fontFamily="var(--font-family-sans)"
          letterSpacing="-0.01em"
        >
          Opportunity Attractiveness →
        </text>
        <text
          x={14} y={PADDING.top + plotH / 2}
          textAnchor="middle" fontSize={11} fontWeight={600}
          fill="var(--color-accent-blue)" fontFamily="var(--font-family-sans)"
          letterSpacing="-0.01em"
          transform={`rotate(-90, 14, ${PADDING.top + plotH / 2})`}
        >
          ↑ Capability to Serve
        </text>

        {/* Plot border */}
        <rect x={PADDING.left} y={PADDING.top} width={plotW} height={plotH}
          fill="none" stroke="var(--color-border)" strokeWidth={1} rx={4} />

        {/* Scored bubbles */}
        {scored.map(account => {
          const cx = scaleX(account.attractivenessScore);
          const cy = scaleY(account.capabilityScore);
          const r = getBubbleRadius(account);
          const stale = isStale(account);
          const color = getAccountColor(account, colorField, distinctColorValues);
          const sizeVal = getAccountSizeValue(account, sizeField);

          return (
            <g key={account.id} style={{ cursor: 'pointer' }}
              onClick={() => onBubbleClick(account.id)}
              onMouseEnter={() => setTooltip({ account, svgX: cx, svgY: cy })}
              onMouseLeave={() => setTooltip(null)}
            >
              <motion.circle cx={cx} cy={cy} r={r + 1} fill="rgba(0,0,0,0.08)" initial={false} animate={{ cx, cy }} transition={{ duration: 0.4 }} />
              <motion.circle
                cx={cx} cy={cy} r={r}
                fill={color}
                fillOpacity={stale ? 0.35 : 0.7}
                stroke={color}
                strokeWidth={2}
                strokeOpacity={stale ? 0.3 : 0.9}
                initial={false}
                animate={{ cx, cy }}
                transition={{ duration: 0.4 }}
              />
              <text
                x={cx} y={r >= 14 ? cy - 1 : cy + 3}
                textAnchor="middle"
                fontSize={10} fontWeight={700}
                fill="white"
                fontFamily="var(--font-family-sans)"
                opacity={stale ? 0.5 : 1}
                style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.3)', transition: 'all 0.4s ease-out' }}
              >
                {account.name || 'Unnamed Account'}
              </text>
              {r >= 14 && (
                <text
                  x={cx} y={cy + 9}
                  textAnchor="middle" fontSize={8} fontWeight={700}
                  fill="white" fontFamily="var(--font-family-sans)"
                  opacity={stale ? 0.5 : 0.9}
                  style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.3)', transition: 'all 0.4s ease-out' }}
                >
                  {sizeField === 'size' ? formatCurrency(sizeVal) : sizeVal.toLocaleString()}
                </text>
              )}
            </g>
          );
        })}

        {/* Unscored parking lot */}
        {unscored.length > 0 && (
          <g>
            <line
              x1={PADDING.left} y1={viewHeight + 2}
              x2={PADDING.left + plotW} y2={viewHeight + 2}
              stroke="var(--color-border)" strokeWidth={1} strokeDasharray="4,3"
            />
            <text
              x={PADDING.left + 2} y={viewHeight + 16}
              fontSize={9} fontWeight={700}
              fill="var(--color-text-tertiary)"
              fontFamily="var(--font-family-sans)"
              letterSpacing="0.08em"
            >
              UNSCORED
            </text>
            {unscored.map((account, i) => {
              const cols = Math.min(unscored.length, 9);
              const cx = PADDING.left + 30 + (i % cols) * Math.min(70, plotW / cols);
              const cy = viewHeight + 34;
              return (
                <g key={account.id} style={{ cursor: 'pointer' }}
                  onClick={() => onBubbleClick(account.id)}
                >
                  <circle cx={cx} cy={cy} r={7}
                    fill="none" stroke="var(--color-text-tertiary)"
                    strokeWidth={1.5} strokeDasharray="3,2"
                  />
                  <text x={cx} y={cy + 18} textAnchor="middle"
                    fontSize={8} fontWeight={500}
                    fill="var(--color-text-tertiary)" fontFamily="var(--font-family-sans)"
                  >
                    {account.name.length > 9 ? account.name.slice(0, 8) + '…' : account.name}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && containerRef.current && (() => {
        const rect = containerRef.current.getBoundingClientRect();
        const svgScale = rect.width / viewWidth;
        const tipX = tooltip.svgX * svgScale;
        const tipY = tooltip.svgY * svgScale;
        const sizeVal = getAccountSizeValue(tooltip.account, sizeField);
        return (
          <div
            style={{
              position: 'absolute',
              left: Math.min(tipX + 16, rect.width - 200),
              top: Math.max(tipY - 50, 4),
              background: 'var(--color-topbar)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 11,
              lineHeight: 1.7,
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: 160,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{tooltip.account.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Attractiveness</span>
              <span style={{ color: '#f0a080', fontWeight: 600 }}>{tooltip.account.attractivenessScore.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Capability</span>
              <span style={{ color: '#80b8e8', fontWeight: 600 }}>{tooltip.account.capabilityScore.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{sizeLabel}</span>
              <span style={{ fontWeight: 600 }}>
                {sizeField === 'size' ? formatCurrency(sizeVal) : sizeVal.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Scored</span>
              <span>{tooltip.account.scoredCount}/{tooltip.account.totalCriteria}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
