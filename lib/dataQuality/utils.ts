export function pctChange(prior: number, current: number): number {
  if (prior === 0) return current === 0 ? 0 : 100;
  return ((current - prior) / Math.abs(prior)) * 100;
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function formatAdvisoryDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Human-readable gap since reconciliation, e.g. "about 5 weeks ago". */
export function formatGapSinceReconciliation(daysBehind: number): string {
  if (daysBehind < 14) return 'less than 2 weeks ago';
  const weeks = Math.round(daysBehind / 7);
  if (weeks < 8) return `about ${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.round(daysBehind / 30);
  return `about ${months} month${months === 1 ? '' : 's'} ago`;
}
