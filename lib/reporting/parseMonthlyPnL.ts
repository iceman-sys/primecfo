import { pickNumericColValue } from '@/lib/reportUtils';

type ColDataItem = { value?: string; Value?: string } | Record<string, unknown>;

function colVal(c: ColDataItem | undefined): string {
  if (c == null) return '';
  const v =
    (c as { value?: string | number }).value ?? (c as { Value?: string | number }).Value;
  if (v == null) return '';
  return String(v).trim();
}

/** Parse QB currency string to number. */
export function qbMoney(s: string): number {
  if (!s || s === '-' || s === '—') return 0;
  let cleaned = String(s).replace(/[$,]/g, '').trim();
  const neg = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (neg) cleaned = cleaned.slice(1, -1).trim();
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

/**
 * Reads month column labels and numeric series from a multi-column ProfitAndLoss report.
 */
export function parseMonthlyPnLSeries(raw: unknown): {
  monthLabels: string[];
  revenues: number[];
  expenses: number[];
  netIncomes: number[];
} {
  const empty = { monthLabels: [] as string[], revenues: [] as number[], expenses: [] as number[], netIncomes: [] as number[] };
  const doc = raw as {
    Columns?: { Column?: Array<Record<string, unknown>> };
    Rows?: unknown;
  };
  const cols = doc.Columns?.Column;
  if (!Array.isArray(cols) || cols.length < 2) return empty;

  const monthLabels = cols.slice(1).map((c) => {
    const title = c.ColTitle as { value?: string } | undefined;
    return (title?.value ?? '').trim() || '—';
  });

  const n = monthLabels.length;
  const findRowValues = (labelNeedle: string): number[] => {
    const values = new Array(n).fill(0);
    const walk = (rows: { Row?: unknown[] } | undefined): boolean => {
      if (!rows?.Row) return false;
      for (const row of rows.Row) {
        const r = row as Record<string, unknown>;
        const colData = r.ColData as ColDataItem[] | undefined;
        if (r.type === 'Data' && Array.isArray(colData) && colData.length > 0) {
          const label = colVal(colData[0]).toLowerCase();
          if (label.includes(labelNeedle)) {
            for (let i = 0; i < n; i++) {
              const cell = colData[i + 1];
              const rawV = pickNumericColValue(cell ? [cell] : undefined) || colVal(cell);
              values[i] = qbMoney(rawV);
            }
            return true;
          }
        }
        const nested = r.Rows as { Row?: unknown[] } | undefined;
        if (nested && walk(nested)) return true;
      }
      return false;
    };
    walk(doc.Rows as { Row?: unknown[] });
    return values;
  };

  // QuickBooks labels vary; try common totals.
  let revenues = findRowValues('total income');
  if (revenues.every((v) => v === 0)) revenues = findRowValues('income');
  let expenses = findRowValues('total expenses');
  if (expenses.every((v) => v === 0)) expenses = findRowValues('expenses');
  let netIncomes = findRowValues('net income');
  if (netIncomes.every((v) => v === 0)) netIncomes = findRowValues('net operating income');

  return { monthLabels, revenues, expenses, netIncomes };
}

export function monthlyGrowthRateFromSix(revenues: number[]): number {
  if (revenues.length < 2) return 0;
  const m1 = revenues[0] ?? 0;
  const m6 = revenues[revenues.length - 1] ?? 0;
  if (Math.abs(m1) < 1e-6) return 0;
  return (m6 - m1) / m1 / 5;
}
