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

function findTotalRowAmount(
  rows: FlatMultiPeriodRow[],
  colIdx: number,
  patterns: string[],
  exclude: string[] = []
): number | null {
  for (const row of rows) {
    const norm = normalize(row.account);
    if (exclude.some((e) => norm.includes(e))) continue;
    if (!patterns.some((p) => norm.includes(p))) continue;
    const amt = rowAmount(row, colIdx);
    if (amt !== 0) return amt;
  }
  return null;
}

function sumDetailRows(
  rows: FlatMultiPeriodRow[],
  colIdx: number,
  patterns: string[],
  exclude: string[] = []
): number {
  let sum = 0;
  for (const row of rows) {
    if (row.rowKind === 'sectionHeader' || row.rowKind === 'grandTotal') continue;
    const norm = normalize(row.account);
    if (norm.startsWith('total ')) continue;
    if (exclude.some((e) => norm.includes(e))) continue;
    if (!patterns.some((p) => norm.includes(p))) continue;
    sum += Math.abs(rowAmount(row, colIdx));
  }
  return sum;
}

/** Net operating income from P&L (before interest, taxes, other below-the-line items). */
export function extractNetOperatingIncome(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;
  const colIdx = pickTotalColumnIndex(rows);

  const noi =
    findTotalRowAmount(rows, colIdx, ['net operating income']) ??
    findTotalRowAmount(rows, colIdx, ['net ordinary income']) ??
    findTotalRowAmount(rows, colIdx, ['operating income'], ['net operating', 'net ordinary', 'other']);

  return noi != null && noi !== 0 ? noi : null;
}

/** P&L depreciation & amortization expense lines (not accumulated depreciation on BS). */
export function extractDepreciationAmortization(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;
  const colIdx = pickTotalColumnIndex(rows);

  const sum = sumDetailRows(
    rows,
    colIdx,
    ['depreciation', 'amortization', 'depletion'],
    ['accumulated', 'accum']
  );

  return sum > 0 ? sum : null;
}

/** Income-type taxes only (city/income tax expense) — excludes payroll taxes in COGS. */
export function extractIncomeTaxExpense(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;
  const colIdx = pickTotalColumnIndex(rows);

  const sum = sumDetailRows(
    rows,
    colIdx,
    ['income tax', 'taxes-city', 'taxes city', 'provision for income', 'federal income tax', 'state income tax'],
    ['payroll', 'sales tax', 'property tax']
  );

  return sum > 0 ? sum : null;
}

const INTEREST_INCOME_EXCLUDE = [
  'interest income',
  'interest earned',
  'interest revenue',
  'dividend',
];

/**
 * Total interest EXPENSE from the P&L. Matches any expense line containing "interest"
 * (e.g. "Interest Expense", "Interest (other than mortgage)", "Loan Interest") plus
 * finance charges, while excluding interest income and section subtotals.
 */
export function extractInterestExpense(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;
  const colIdx = pickTotalColumnIndex(rows);

  let sum = 0;
  for (const row of rows) {
    if (row.rowKind === 'subtotal' || row.rowKind === 'grandTotal' || row.rowKind === 'sectionHeader') {
      continue;
    }
    const norm = normalize(row.account);
    if (norm.includes('income') || norm.includes('revenue')) continue;
    if (INTEREST_INCOME_EXCLUDE.some((e) => norm.includes(e))) continue;
    if (norm.startsWith('total ')) continue;

    const isInterest = norm.includes('interest') || norm.includes('finance charge');
    if (!isInterest) continue;

    sum += Math.abs(rowAmount(row, colIdx));
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
