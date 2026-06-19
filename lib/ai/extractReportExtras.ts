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

function sumMatchingRows(
  rows: FlatMultiPeriodRow[],
  colIdx: number,
  patterns: string[],
  exclude: string[] = []
): number {
  let sum = 0;
  for (const row of rows) {
    const norm = normalize(row.account);
    if (exclude.some((e) => norm.includes(e))) continue;
    if (!patterns.some((p) => norm.includes(p))) continue;
    sum += Math.abs(rowAmount(row, colIdx));
  }
  return sum;
}

export function extractInterestExpense(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;
  const colIdx = pickTotalColumnIndex(rows);
  const total = sumMatchingRows(
    rows,
    colIdx,
    ['interest expense', 'interest paid', 'finance charge', 'loan interest'],
    ['income', 'revenue']
  );
  return total > 0 ? total : null;
}

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

    const amt = rowAmount(row, colIdx);
    if (amt < 0) sum += Math.abs(amt);
    if (
      norm.includes('loan payment') ||
      norm.includes('principal') ||
      norm.includes('debt repayment') ||
      norm.includes('repayment of')
    ) {
      sum += Math.abs(amt);
    }
  }

  if (sum === 0) {
    sum = sumMatchingRows(
      rows,
      colIdx,
      ['loan payment', 'principal payment', 'repayment of loan', 'debt repayment', 'payments on loan']
    );
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
