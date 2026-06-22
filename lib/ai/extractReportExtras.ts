import { flattenReportRowsMulti, type FlatMultiPeriodRow } from '@/lib/reportUtils';

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

function pickTotalColumnIndex(rows: FlatMultiPeriodRow[]): number {
  return Math.max(0, (rows[0]?.values.length ?? 1) - 1);
}

function rowAmount(row: FlatMultiPeriodRow, colIdx: number): number {
  const raw = row.values[colIdx] ?? row.values[row.values.length - 1];
  return parseVal(raw);
}

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

const FINANCING_EXCLUDE_PATTERNS = [
  'shareholder',
  'owner draw',
  "owner's draw",
  'distribution',
  'dividend',
  'contribution',
  'capital contribution',
  'proceeds from',
  'new loan',
  'loan proceeds',
  'borrowing',
];

function isPrincipalPaymentRow(norm: string): boolean {
  return PRINCIPAL_PAYMENT_PATTERNS.some((p) => norm.includes(p));
}

function isExcludedFinancingRow(norm: string): boolean {
  return FINANCING_EXCLUDE_PATTERNS.some((p) => norm.includes(p));
}

export function extractInterestExpense(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;
  const colIdx = pickTotalColumnIndex(rows);

  let sum = 0;
  for (const row of rows) {
    const norm = normalize(row.account);
    if (norm.includes('income') || norm.includes('revenue')) continue;
    if (
      norm.includes('interest expense') ||
      norm.includes('interest paid') ||
      norm.includes('finance charge') ||
      norm.includes('loan interest')
    ) {
      sum += Math.abs(rowAmount(row, colIdx));
    }
  }
  return sum > 0 ? sum : null;
}

/** Actual principal paid — financing section only, explicit loan payment rows (no draws/distributions). */
export function extractFinancingPrincipalPayments(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;
  const colIdx = pickTotalColumnIndex(rows);

  let inFinancing = false;
  let sum = 0;

  for (const row of rows) {
    const norm = normalize(row.account);
    if (norm.includes('financing activities') || norm === 'financing') {
      inFinancing = true;
      continue;
    }
    if (
      inFinancing &&
      (norm.includes('investing activities') ||
        norm.includes('operating activities') ||
        norm.includes('net cash increase'))
    ) {
      break;
    }
    if (!inFinancing) continue;
    if (isExcludedFinancingRow(norm)) continue;
    if (!isPrincipalPaymentRow(norm)) continue;

    sum += Math.abs(rowAmount(row, colIdx));
  }

  return sum > 0 ? sum : null;
}

export function extractNetCashIncreaseTotal(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;
  const colIdx = pickTotalColumnIndex(rows);

  for (const row of rows) {
    const norm = normalize(row.account);
    if (
      norm.includes('net cash increase') ||
      norm.includes('net increase in cash') ||
      norm.includes('net change in cash')
    ) {
      return rowAmount(row, colIdx);
    }
  }
  return null;
}
