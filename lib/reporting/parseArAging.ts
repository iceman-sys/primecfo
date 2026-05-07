import { pickNumericColValue } from '@/lib/reportUtils';
import { qbMoney } from '@/lib/reporting/parseMonthlyPnL';

type ColDataItem = { value?: string; Value?: string } | Record<string, unknown>;

function colVal(c: ColDataItem | undefined): string {
  if (c == null) return '';
  const v =
    (c as { value?: string | number }).value ?? (c as { Value?: string | number }).Value;
  if (v == null) return '';
  return String(v).trim();
}

/**
 * Parse AR Aging Summary into bucket totals (first data column = total row).
 */
export function parseArAgingBuckets(raw: unknown): {
  total: number;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days91_plus: number;
} {
  const zero = {
    total: 0,
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days91_plus: 0,
  };
  const doc = raw as { Columns?: { Column?: Array<Record<string, unknown>> }; Rows?: unknown };

  const cols = doc.Columns?.Column;
  if (!Array.isArray(cols) || cols.length < 2) return zero;

  const headerTitles = cols.map((c) => {
    const t = c.ColTitle as { value?: string } | undefined;
    return (t?.value ?? '').toLowerCase();
  });

  const idx = {
    current: headerTitles.findIndex((h) => /current|^0/.test(h) && !h.includes('total')),
    d30: headerTitles.findIndex((h) => h.includes('1-30') || h.includes('1–30')),
    d60: headerTitles.findIndex((h) => h.includes('31-60') || h.includes('31–60')),
    d90: headerTitles.findIndex((h) => h.includes('61-90') || h.includes('61–90')),
    d91: headerTitles.findIndex((h) => h.includes('91') || h.includes('over')),
  };

  const readTotalsRow = (): number[] => {
    const out = new Array(cols.length).fill(0);
    const walk = (rows: { Row?: unknown[] } | undefined): void => {
      if (!rows?.Row) return;
      for (const row of rows.Row) {
        const r = row as Record<string, unknown>;
        const colData = r.ColData as ColDataItem[] | undefined;
        if (r.type === 'Data' && Array.isArray(colData) && colData.length > 1) {
          const label = colVal(colData[0]).toLowerCase();
          if (label.includes('total')) {
            for (let i = 1; i < colData.length; i++) {
              const cell = colData[i];
              const rawV = pickNumericColValue(cell ? [cell] : undefined) || colVal(cell);
              out[i] = qbMoney(rawV);
            }
            return;
          }
        }
        walk(r.Rows as { Row?: unknown[] });
      }
    };
    walk(doc.Rows as { Row?: unknown[] });
    return out;
  };

  const vals = readTotalsRow();
  const sumNonLabel = vals.slice(1).reduce((a, b) => a + b, 0);
  const pick = (i: number) => (i >= 0 && i < vals.length ? vals[i] : 0);

  return {
    total: sumNonLabel || pick(1),
    current: idx.current > 0 ? pick(idx.current) : pick(1),
    days1_30: idx.d30 > 0 ? pick(idx.d30) : 0,
    days31_60: idx.d60 > 0 ? pick(idx.d60) : 0,
    days61_90: idx.d90 > 0 ? pick(idx.d90) : 0,
    days91_plus: idx.d91 > 0 ? pick(idx.d91) : 0,
  };
}

/** Portion of AR past N days bucket proxy: 31+ = 31-60+61-90+91+ */
export function arOver30Ratio(b: ReturnType<typeof parseArAgingBuckets>): number {
  if (b.total <= 0) return 0;
  const over30 = b.days31_60 + b.days61_90 + b.days91_plus;
  return over30 / b.total;
}
