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
 * Average monthly "net cash from operating activities" from a multi-period QBO Cash Flow report.
 * Used for Act-tier extended projection when available (falls back to P&amp;L expense in engine).
 */
export function averageMonthlyOperatingNetCash(raw: unknown): number | null {
  const doc = raw as {
    Columns?: { Column?: Array<Record<string, unknown>> };
    Rows?: unknown;
  };
  const cols = doc.Columns?.Column;
  if (!Array.isArray(cols) || cols.length < 2) return null;

  const monthCount = cols.length - 1;
  const values = new Array(monthCount).fill(0);
  let foundRow = false;

  const matchesOperatingNet = (label: string): boolean => {
    const l = label.toLowerCase();
    if (l.includes('investing') || l.includes('financing')) return false;
    return (
      l.includes('net cash provided by operating') ||
      l.includes('net cash from operating') ||
      (l.includes('operating activities') && l.includes('net') && l.includes('cash'))
    );
  };

  const walk = (rows: { Row?: unknown[] } | undefined): void => {
    if (!rows?.Row) return;
    for (const row of rows.Row) {
      const r = row as Record<string, unknown>;
      const colData = r.ColData as ColDataItem[] | undefined;
      if (r.type === 'Data' && Array.isArray(colData) && colData.length > 0) {
        const label = colVal(colData[0]).toLowerCase();
        if (matchesOperatingNet(label)) {
          foundRow = true;
          for (let i = 0; i < monthCount; i++) {
            const cell = colData[i + 1];
            const rawV = pickNumericColValue(cell ? [cell] : undefined) || colVal(cell);
            values[i] = qbMoney(rawV);
          }
        }
      }
      const nested = r.Rows as { Row?: unknown[] } | undefined;
      if (nested) walk(nested);
    }
  };

  walk(doc.Rows as { Row?: unknown[] });

  if (!foundRow) return null;
  const nonZero = values.filter((v) => Math.abs(v) > 1e-6);
  if (nonZero.length === 0) return null;
  return nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
}
