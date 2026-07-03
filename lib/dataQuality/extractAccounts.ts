import { flattenReportRowsMulti } from '@/lib/reportUtils';
import type { DataQualityAccount } from './types';

function parseVal(v: string | undefined): number {
  if (!v || v === '-') return 0;
  let cleaned = String(v).replace(/[$,]/g, '').trim();
  const wrapped = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (wrapped) cleaned = cleaned.slice(1, -1).trim();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  return wrapped ? -Math.abs(num) : num;
}

/** Extract account name + balance from balance sheet report rows (latest column). */
export function extractAccountBalancesFromReport(raw: unknown): DataQualityAccount[] {
  if (!raw || typeof raw !== 'object') return [];
  const { rows } = flattenReportRowsMulti(raw as Record<string, unknown>);
  const out: DataQualityAccount[] = [];

  for (const row of rows) {
    if (row.rowKind === 'sectionHeader' || row.rowKind === 'grandTotal') continue;
    const name = row.account?.trim();
    if (!name || name.toLowerCase().startsWith('total ')) continue;
    const colIdx = Math.max(0, row.values.length - 1);
    const balance = parseVal(row.values[colIdx]);
    if (balance === 0) continue;
    out.push({ name, balance });
  }

  return out;
}
