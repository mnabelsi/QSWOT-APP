/**
 * Format a euro amount with dynamic K€/M€ suffix.
 * Input is raw euros (e.g., 450000).
 * Output: "450K€", "1.5M€", "900€"
 */
export function formatCurrency(value: number): string {
  if (value === 0) return '0€';

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${sign}${formatted}M€`;
  }

  if (abs >= 1_000) {
    const thousands = abs / 1_000;
    const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${sign}${formatted}K€`;
  }

  return `${sign}${abs}€`;
}

/**
 * Parse a user-entered currency string back to a raw euro number.
 * Handles: "450k", "1.5m", "450000", "450K€", "1.5M€"
 */
export function parseCurrencyInput(input: string): number | null {
  const cleaned = input.trim().replace(/[€,\s]/g, '');
  if (!cleaned) return null;

  const match = cleaned.match(/^(-?\d+\.?\d*)\s*([kKmM])?$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;

  const suffix = match[2]?.toLowerCase();
  if (suffix === 'm') return num * 1_000_000;
  if (suffix === 'k') return num * 1_000;
  return num;
}
