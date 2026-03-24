import type { Zone } from '../types';

const zoneConfig: Record<Zone, { bg: string; color: string; label: string }> = {
  green: { bg: '#e8f5e0', color: 'var(--color-zone-green)', label: 'Green' },
  yellow: { bg: '#fef3cd', color: 'var(--color-zone-amber)', label: 'Yellow' },
  red: { bg: '#fde8e8', color: 'var(--color-zone-red)', label: 'Red' },
};

export default function ZoneBadge({ zone, size = 'default' }: { zone: Zone; size?: 'small' | 'default' }) {
  const config = zoneConfig[zone];
  const isSmall = size === 'small';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: isSmall ? '1px 6px' : '2px 10px',
        borderRadius: 6,
        fontSize: isSmall ? 10 : 11,
        fontWeight: 600,
        color: config.color,
        background: config.bg,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        lineHeight: isSmall ? '16px' : '18px',
      }}
    >
      <span style={{
        width: isSmall ? 5 : 6,
        height: isSmall ? 5 : 6,
        borderRadius: '50%',
        background: config.color,
      }} />
      {config.label}
    </span>
  );
}
