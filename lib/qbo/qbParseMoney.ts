import type { QboMoneyEntity } from './queryRunner';

export function parseEntityBalance(e: Pick<QboMoneyEntity, 'Balance'>): number {
  const raw = e.Balance;
  if (raw == null) return 0;
  if (typeof raw === 'number') return raw;
  let s = String(raw).replace(/[$,]/g, '').trim();
  const neg = s.startsWith('(') && s.endsWith(')');
  if (neg) s = s.slice(1, -1);
  const v = parseFloat(s);
  return Number.isNaN(v) ? 0 : neg ? -Math.abs(v) : v;
}
