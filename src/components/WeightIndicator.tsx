export default function WeightIndicator({ total }: { total: number }) {
  const pct = Math.round(total * 100);
  const isValid = pct === 100;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      fontWeight: 600,
      color: isValid ? 'var(--color-zone-green)' : 'var(--color-zone-red)',
    }}>
      <span>{isValid ? '✓' : '✗'}</span>
      <span>Total: {pct}% / 100%</span>
    </div>
  );
}
