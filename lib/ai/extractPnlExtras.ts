import { flattenReportRowsMulti, type FlatMultiPeriodRow } from '@/lib/reportUtils';
import type { RevenueLineItem } from '@/lib/ai/getFinancialContext';

export type PnlExtrasExtract = {
  ownerCompensation: number | null;
  ownerCompSalary: number | null;
  ownerCompDraws: number | null;
  taxExpense: number | null;
  grossProfit: number | null;
  costOfGoodsSold: number | null;
  revenueLineItems: RevenueLineItem[];
};

const OWNER_COMP_PNL_PATTERNS = [
  'ceo salaries',
  'executive salaries',
  'management',
  'officer compensation',
  'officers compensation',
  'owner pay',
  "owner's pay",
  'owner salary',
  'owner compensation',
  'deferred compensation',
];

const OWNER_COMP_BS_PATTERNS = ['shareholder draw', 'deferred compensation'];

const TAX_PATTERNS = [
  'income tax expense',
  'tax expense',
  'income taxes',
  'provision for income taxes',
];

const TAX_EXCLUDE = ['sales tax', 'payroll tax'];

function normalizeLabel(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseVal(v: string | undefined): number {
  if (!v) return 0;
  let cleaned = String(v).replace(/[$,]/g, '').trim();
  const wrapped = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (wrapped) cleaned = cleaned.slice(1, -1).trim();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  return wrapped ? -Math.abs(num) : num;
}

function pickTotalColumnIndex(columnTitles: string[], rows: FlatMultiPeriodRow[]): number {
  const width = rows[0]?.values.length ?? columnTitles.length;
  return Math.max(0, width - 1);
}

function rowAmount(row: FlatMultiPeriodRow, colIdx: number): number {
  const raw = row.values[colIdx] ?? row.values[row.values.length - 1];
  return parseVal(raw);
}

function sumMatchingDetailRows(
  rows: FlatMultiPeriodRow[],
  patterns: string[],
  colIdx: number
): number {
  let sum = 0;
  for (const row of rows) {
    if (row.rowKind === 'subtotal' || row.rowKind === 'grandTotal' || row.rowKind === 'sectionHeader') {
      continue;
    }
    const norm = normalizeLabel(row.account);
    if (norm.startsWith('total ')) continue;
    if (patterns.some((p) => norm.includes(p))) {
      sum += Math.abs(rowAmount(row, colIdx));
    }
  }
  return sum;
}

function findTotalRowAmount(
  rows: FlatMultiPeriodRow[],
  patterns: string[],
  colIdx: number
): number {
  for (const row of rows) {
    const norm = normalizeLabel(row.account);
    if (!patterns.some((p) => norm.includes(p))) continue;
    const amt = rowAmount(row, colIdx);
    if (amt !== 0) return Math.abs(amt);
  }
  return 0;
}

function extractRevenueLineItems(rows: FlatMultiPeriodRow[], colIdx: number): RevenueLineItem[] {
  const items: RevenueLineItem[] = [];
  let inIncome = false;

  for (const row of rows) {
    const norm = normalizeLabel(row.account);
    if (norm === 'income' || norm === 'revenue') {
      inIncome = true;
      continue;
    }
    if (norm.startsWith('total ') || norm.includes('cost of') || norm.includes('expense')) {
      inIncome = false;
      continue;
    }
    if (!inIncome || row.rowKind === 'sectionHeader') continue;
    if (row.rowKind === 'subtotal' || row.rowKind === 'grandTotal') continue;

    const amt = rowAmount(row, colIdx);
    if (amt !== 0) items.push({ label: row.account, amount: amt });
  }

  return items;
}

export function extractPnlExtrasFromRaw(rawJson: unknown): PnlExtrasExtract {
  const doc = rawJson as Record<string, unknown>;
  const { columnTitles, rows } = flattenReportRowsMulti(doc);
  const colIdx = pickTotalColumnIndex(columnTitles, rows);

  const ownerCompSalary = sumMatchingDetailRows(rows, OWNER_COMP_PNL_PATTERNS, colIdx);
  const salaryFallback = findTotalRowAmount(rows, OWNER_COMP_PNL_PATTERNS, colIdx);
  const salaryComp = ownerCompSalary > 0 ? ownerCompSalary : salaryFallback;

  const grossProfit = findTotalRowAmount(rows, ['gross profit', 'gross income'], colIdx);
  const cogs = findTotalRowAmount(
    rows,
    ['total cost of goods sold', 'cost of goods sold', 'total cogs', 'cogs', 'cost of sales'],
    colIdx
  );

  let taxExpense = 0;
  for (const row of rows) {
    const norm = normalizeLabel(row.account);
    if (TAX_EXCLUDE.some((e) => norm.includes(e))) continue;
    if (TAX_PATTERNS.some((p) => norm.includes(p))) {
      taxExpense += Math.abs(rowAmount(row, colIdx));
    }
  }

  return {
    ownerCompensation: salaryComp > 0 ? salaryComp : null,
    ownerCompSalary: salaryComp > 0 ? salaryComp : null,
    ownerCompDraws: null,
    taxExpense: taxExpense > 0 ? taxExpense : null,
    grossProfit: grossProfit > 0 ? grossProfit : null,
    costOfGoodsSold: cogs > 0 ? cogs : null,
    revenueLineItems: extractRevenueLineItems(rows, colIdx),
  };
}

export function extractOwnerCompDrawsFromBalanceSheet(rawJson: unknown): number | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  const colIdx = rows[0] ? rows[0].values.length - 1 : 0;
  const draws = sumMatchingDetailRows(rows, OWNER_COMP_BS_PATTERNS, colIdx);
  return draws > 0 ? draws : null;
}

export function mergeOwnerCompensation(pnl: PnlExtrasExtract): number | null {
  return pnl.ownerCompSalary ?? null;
}

/** Compare recurring revenue: last month column vs prior month when multi-column P&L exists. */
export function extractPriorColumnRevenueLineItems(rawJson: unknown): RevenueLineItem[] {
  const doc = rawJson as Record<string, unknown>;
  const { columnTitles, rows } = flattenReportRowsMulti(doc);
  if (columnTitles.length < 2) return [];
  const priorIdx = columnTitles.length - 2;
  return extractRevenueLineItems(rows, priorIdx);
}
