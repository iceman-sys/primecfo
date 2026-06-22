import { flattenReportRowsMulti, type FlatMultiPeriodRow } from '@/lib/reportUtils';

export type BalanceSheetSnapshot = {
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  cash: number | null;
  accountsReceivable: number | null;
  liquidAssets: number | null;
  longTermDebt: number | null;
  creditCardBalances: number | null;
  shareholderDraws: number | null;
  retainedEarnings: number | null;
  totalDebt: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  debtToAssets: number | null;
};

function normalize(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
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

function findTotalAmount(
  rows: FlatMultiPeriodRow[],
  colIdx: number,
  patterns: string[],
  exclude: string[] = []
): number | null {
  let last = 0;
  let found = false;
  for (const row of rows) {
    const norm = normalize(row.account);
    if (exclude.some((e) => norm.includes(e))) continue;
    if (!patterns.some((p) => norm.includes(p))) continue;
    last = rowAmount(row, colIdx);
    found = true;
  }
  return found ? last : null;
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

export function extractBalanceSheetSnapshot(rawJson: unknown): BalanceSheetSnapshot | null {
  const doc = rawJson as Record<string, unknown>;
  const { rows } = flattenReportRowsMulti(doc);
  if (rows.length === 0) return null;

  const colIdx = pickTotalColumnIndex(rows);

  const totalAssets = findTotalAmount(rows, colIdx, ['total assets']);
  const totalLiabilities = findTotalAmount(rows, colIdx, ['total liabilities'], ['equity', 'and equity']);
  const totalEquity =
    findTotalAmount(rows, colIdx, ['total equity'], ['liabilities']) ??
    (totalAssets != null && totalLiabilities != null ? totalAssets - totalLiabilities : null);

  const currentAssets = findTotalAmount(rows, colIdx, ['total current assets']);
  const currentLiabilities = findTotalAmount(rows, colIdx, ['total current liabilities']);

  const cash =
    sumDetailRows(rows, colIdx, ['bank accounts', 'checking', 'savings', 'undeposited funds']) ||
    findTotalAmount(rows, colIdx, ['total bank accounts']) ||
    0;

  const accountsReceivable =
    sumDetailRows(rows, colIdx, ['accounts receivable'], ['payable']) ||
    findTotalAmount(rows, colIdx, ['accounts receivable']) ||
    0;

  const liquidAssets = cash + accountsReceivable;

  const longTermDebt = sumDetailRows(
    rows,
    colIdx,
    ['eidl', 'sba', 'commercial loan', 'term loan', 'notes payable', 'long-term', 'long term', 'mortgage'],
    ['credit card', 'line of credit', 'payable']
  );

  const creditCardBalances = sumDetailRows(
    rows,
    colIdx,
    ['credit card', 'visa', 'mastercard', 'amex', 'discover', 'revolving']
  );

  const shareholderDraws = sumDetailRows(
    rows,
    colIdx,
    ['shareholder draw', 'owner draw', "owner's draw", 'member draw', 'distribution']
  );

  const retainedEarnings =
    findTotalAmount(rows, colIdx, ['retained earnings']) ??
    findTotalAmount(rows, colIdx, ['accumulated earnings']);

  const ltd = longTermDebt ?? 0;
  const cc = creditCardBalances ?? 0;
  const totalDebt = ltd + cc > 0 ? ltd + cc : null;

  const currentRatio =
    currentAssets != null && currentLiabilities != null && currentLiabilities !== 0
      ? Math.round((currentAssets / Math.abs(currentLiabilities)) * 100) / 100
      : null;

  const quickRatio =
    currentLiabilities != null && currentLiabilities !== 0
      ? Math.round((liquidAssets / Math.abs(currentLiabilities)) * 100) / 100
      : null;

  const debtToAssets =
    totalAssets != null && totalAssets !== 0 && totalLiabilities != null
      ? Math.round((Math.abs(totalLiabilities) / Math.abs(totalAssets)) * 100) / 100
      : null;

  return {
    totalAssets,
    totalLiabilities,
    totalEquity,
    currentAssets,
    currentLiabilities,
    cash: cash || null,
    accountsReceivable: accountsReceivable || null,
    liquidAssets: liquidAssets || null,
    longTermDebt: longTermDebt || null,
    creditCardBalances: creditCardBalances || null,
    shareholderDraws: shareholderDraws || null,
    retainedEarnings,
    totalDebt,
    currentRatio,
    quickRatio,
    debtToAssets,
  };
}
