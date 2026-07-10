import { extractCashFlowNetByPeriod } from '@/lib/metrics/parseQboReport';
import { flattenReportRowsMulti } from '@/lib/reportUtils';
import { isPeriodComplete } from '@/lib/metrics/partialMonth';
import type { MonthlyCashPoint } from './scenarioBands';

type QboColumnMeta = { Name?: string; Value?: string };
type QboColumn = {
  ColTitle?: { value?: string };
  ColType?: string;
  MetaData?: QboColumnMeta[];
};

function normalize(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseVal(v: string | undefined): number {
  if (!v || v === '-') return 0;
  let cleaned = String(v).replace(/[$,]/g, '').trim();
  const wrapped = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (wrapped) cleaned = cleaned.slice(1, -1).trim();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  return wrapped ? -Math.abs(num) : num;
}

const OWNER_DISTRIBUTION_PATTERNS = [
  'shareholder distribution',
  'shareholder draw',
  'shareholder draws',
  'owner draw',
  "owner's draw",
  'owner draws',
  'member draw',
  'member distribution',
  'partner distribution',
  'tax draw',
  'tax distribution',
  'estimated tax',
  'income tax payment',
  'taxes-ac',
  'taxes ac',
];

const PRINCIPAL_PAYMENT_PATTERNS = [
  'loan payment',
  'principal payment',
  'repayment of loan',
  'debt repayment',
  'payments on loan',
  'payment of loan',
  'repayment of debt',
  'principal paid',
];

function isInFinancingSection(
  rows: { account: string }[],
  index: number
): boolean {
  for (let i = index; i >= 0; i--) {
    const norm = normalize(rows[i]!.account);
    if (norm.includes('financing activities') || norm === 'financing') return true;
    if (norm.includes('investing activities') || norm.includes('operating activities')) return false;
  }
  return false;
}

/** Per-period owner/tax draws (absolute outflows) aligned to CF period columns. */
export function extractOwnerDrawsByPeriod(raw: unknown): number[] {
  const doc = raw as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return [];

  const periodCount = Math.max(0, (rows[0]?.values.length ?? 1) - 1);
  if (periodCount <= 0) return [];

  const draws = Array.from({ length: periodCount }, () => 0);

  rows.forEach((row, index) => {
    if (row.rowKind === 'sectionHeader' || row.rowKind === 'grandTotal') return;
    const norm = normalize(row.account);
    if (norm.startsWith('total ')) return;
    if (!isInFinancingSection(rows, index)) return;
    if (PRINCIPAL_PAYMENT_PATTERNS.some((p) => norm.includes(p))) return;
    if (!OWNER_DISTRIBUTION_PATTERNS.some((p) => norm.includes(p))) return;

    for (let c = 0; c < periodCount; c++) {
      const amt = Math.abs(parseVal(row.values[c + 1]));
      draws[c]! += amt;
    }
  });

  return draws;
}

function extractPeriodEndDates(raw: unknown): (string | null)[] {
  const doc = raw as { Columns?: { Column?: QboColumn[] } };
  const cols = doc.Columns?.Column;
  if (!Array.isArray(cols) || cols.length < 2) return [];

  return cols.slice(1).map((col) => {
    const meta = col.MetaData;
    if (Array.isArray(meta)) {
      const end = meta.find((m) => m.Name === 'EndDate')?.Value;
      if (end) return end.slice(0, 10);
    }
    return null;
  });
}

/**
 * Build monthly net cash + owner-draw series from a multi-column Cash Flow report.
 * Drops a trailing partial/unreconciled month when lastReconciled is known.
 */
export function buildMonthlyCashPoints(
  raw: unknown,
  lastReconciled: Date | null
): MonthlyCashPoint[] {
  const nets = extractCashFlowNetByPeriod(raw);
  if (nets.length === 0) return [];

  const ends = extractPeriodEndDates(raw);
  const draws = extractOwnerDrawsByPeriod(raw);

  const points: MonthlyCashPoint[] = nets.map((netCash, i) => ({
    endDate: ends[i] ?? null,
    netCash,
    ownerDraws: draws[i] ?? 0,
  }));

  // Drop trailing total column if present (often last col is "Total")
  const cols = (raw as { Columns?: { Column?: QboColumn[] } }).Columns?.Column;
  if (Array.isArray(cols) && cols.length > 2) {
    const lastCol = cols[cols.length - 1];
    const isTotal =
      /^total$/i.test((lastCol?.ColType ?? '').trim()) ||
      /^total$/i.test((lastCol?.ColTitle?.value ?? '').trim());
    if (isTotal && points.length === cols.length - 1) {
      points.pop();
    }
  }

  if (!lastReconciled) {
    // Without recon date, still exclude current calendar month if endDate is in the future/current
    const today = new Date();
    const filtered = points.filter((p) => {
      if (!p.endDate) return true;
      return isPeriodComplete(p.endDate, today) || p.endDate < today.toISOString().slice(0, 10);
    });
    // Prefer dropping last if it looks like current partial month
    if (filtered.length > 1) {
      const last = filtered[filtered.length - 1]!;
      if (last.endDate) {
        const end = new Date(`${last.endDate}T12:00:00`);
        const isCurrentMonth =
          end.getFullYear() === today.getFullYear() && end.getMonth() === today.getMonth();
        if (isCurrentMonth) return filtered.slice(0, -1);
      } else {
        // No end dates — drop trailing column as likely partial
        return filtered.slice(0, -1);
      }
    }
    return filtered;
  }

  const complete = points.filter((p) => isPeriodComplete(p.endDate ?? undefined, lastReconciled));
  // If no EndDate metadata, isPeriodComplete treats all as complete — still drop trailing month
  if (complete.length > 1 && complete.every((p) => !p.endDate)) {
    return complete.slice(0, -1);
  }
  return complete;
}
