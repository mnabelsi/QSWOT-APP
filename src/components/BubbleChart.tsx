import { useState, useRef } from 'react';
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

const bubbleColors = {
  green: '#4a8c1c',
  yellow: '#c48a0a',
  red: '#c03030',
};

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

interface TooltipData {
  account: EnrichedAccount;
  svgX: number;
  svgY: number;
}

export default function BubbleChart({ onBubbleClick }: { onBubbleClick: (id: string) => void }) {
  const { enrichedAccounts } = useKAMStore();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const scaleX = (val: number) => {
    const clamped = Math.max(minScore, Math.min(maxScore, val));
    return PADDING.left + ((clamped - minScore) / scoreRange) * plotW;
  };

  const scaleY = (val: number) => {
    const clamped = Math.max(minScore, Math.min(maxScore, val));
    return PADDING.top + plotH - ((clamped - minScore) / scoreRange) * plotH;
  };

  const getBubbleRadius = (size: number | string) => {
    const minR = 6;
    const maxR = 45;
    // Filter out NaN or corrupted string values from older localstorage
    const sizes = enrichedAccounts.map(a => Number(a.size)).filter(s => !isNaN(s));
    if (sizes.length === 0) return minR;
    
    const maxSize = Math.max(...sizes, 1);
    const minSize = Math.min(...sizes, 0);
    
    if (maxSize === minSize) return (minR + maxR) / 2;
    
    const validSize = isNaN(Number(size)) ? minSize : Number(size);
    const sqrtMin = Math.sqrt(minSize);
    const sqrtMax = Math.sqrt(maxSize);
    const sqrtVal = Math.sqrt(validSize);
    
    const normalized = (sqrtVal - sqrtMin) / (sqrtMax - sqrtMin);
    // Explicit NaN fallback just in case
    return isNaN(normalized) ? minR : minR + normalized * (maxR - minR);
  };

  // Smart label placement: prefer right, fall back to left if near edge
  const getLabelAnchor = (cx: number, r: number) => {
    if (cx + r + 60 > PADDING.left + plotW) return { x: cx - r - 4, anchor: 'end' as const };
    return { x: cx + r + 5, anchor: 'start' as const };
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
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
              fontSize={9}
              fontWeight={600}
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
          const r = getBubbleRadius(account.size);
          const stale = isStale(account);
          const label = getLabelAnchor(cx, r);

          return (
            <g key={account.id} style={{ cursor: 'pointer' }}
              onClick={() => onBubbleClick(account.id)}
              onMouseEnter={() => setTooltip({ account, svgX: cx, svgY: cy })}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Shadow */}
              <motion.circle
                cx={cx} cy={cy} r={r + 1}
                fill="rgba(0,0,0,0.08)"
                initial={false}
                animate={{ cx, cy }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
              {/* Bubble */}
              <motion.circle
                cx={cx} cy={cy} r={r}
                fill={bubbleColors[account.zone]}
                fillOpacity={stale ? 0.35 : 0.7}
                stroke={bubbleColors[account.zone]}
                strokeWidth={2}
                strokeOpacity={stale ? 0.3 : 0.9}
                initial={false}
                animate={{ cx, cy }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
              {/* Size label inside bubble */}
              {r >= 14 && (
                <motion.text
                  x={cx} y={cy + 4}
                  textAnchor="middle" fontSize={9} fontWeight={700}
                  fill="white" fontFamily="var(--font-family-sans)"
                  style={{ pointerEvents: 'none' }}
                  initial={false}
                  animate={{ x: cx, y: cy + 4 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {formatCurrency(account.size)}
                </motion.text>
              )}
              {/* Name label outside */}
              <motion.text
                x={label.x} y={cy + 3}
                textAnchor={label.anchor}
                fontSize={10} fontWeight={500}
                fill="var(--color-text-primary)"
                fontFamily="var(--font-family-sans)"
                opacity={stale ? 0.4 : 0.85}
                style={{ pointerEvents: 'none' }}
                initial={false}
                animate={{ x: label.x, y: cy + 3 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {account.name}
              </motion.text>
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
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Size</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(tooltip.account.size)}</span>
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
