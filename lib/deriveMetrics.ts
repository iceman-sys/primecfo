/**
 * Derive normalized metrics from QuickBooks P&L and Balance Sheet report JSON.
 * Used to populate financial_metrics for dashboard summary and trends.
 */

import { flattenReportRows } from './reportUtils';

export type MetricEntry = { metric_key: string; value: number; unit: 'currency' | 'ratio' | 'count' };

function parseValueToNumber(value: string | undefined): number {
  if (value === undefined || value === null || value === '' || value === '-' || value === '—') return 0;
  let cleaned = String(value).replace(/[$,]/g, '').trim();
  const wrappedInParens = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (wrappedInParens) cleaned = cleaned.slice(1, -1).trim();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  return wrappedInParens ? -Math.abs(num) : num;
}

function normalizeLabel(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Find last row whose account label matches any of the patterns (totals usually appear last). */
function findValueByPatterns(
  flatRows: Array<{ account: string; value: string }>,
  patterns: string[]
): number {
  const normPatterns = patterns.map(normalizeLabel);
  let lastVal = 0;
  for (const row of flatRows) {
    const normAccount = normalizeLabel(row.account);
    for (const p of normPatterns) {
      if (normAccount.includes(p) || p.includes(normAccount)) {
        lastVal = parseValueToNumber(row.value);
        break;
      }
    }
  }
  return lastVal;
}

/**
 * Like findValueByPatterns but skip rows whose label contains any of excludeContaining
 * (e.g. "net " to avoid "Net Income" for revenue; "other " to avoid "Total for Other Expenses").
 */
function findValueByPatternsExcluding(
  flatRows: Array<{ account: string; value: string }>,
  patterns: string[],
  excludeContaining: string | string[]
): number {
  const normPatterns = patterns.map(normalizeLabel);
  const excludeList = Array.isArray(excludeContaining)
    ? excludeContaining.map((s) => normalizeLabel(s))
    : [normalizeLabel(excludeContaining)];
  let lastVal = 0;
  for (const row of flatRows) {
    const normAccount = normalizeLabel(row.account);
    const skip = excludeList.some((ex) => normAccount.includes(ex));
    if (skip) continue;
    for (const p of normPatterns) {
      if (normAccount.includes(p) || p.includes(normAccount)) {
        lastVal = parseValueToNumber(row.value);
        break;
      }
    }
  }
  return lastVal;
}

/** Try primary patterns first, then fallback. */
function findBestMatch(
  flatRows: Array<{ account: string; value: string }>,
  primaryPatterns: string[],
  fallbackPatterns: string[]
): number {
  const v = findValueByPatterns(flatRows, primaryPatterns);
  if (v !== 0) return v;
  return findValueByPatterns(flatRows, fallbackPatterns);
}

/**
 * Extract metrics from P&L raw JSON.
 *
 * Formulas (aligned with QuickBooks Profit and Loss report):
 *   Total Revenue   = "Total Income" (section summary)
 *   Total Expenses  = "Total Expenses" (section summary, excludes Other Expenses)
 *   Net Profit      = "Net Income" (bottom line)
 *   Profit Margin   = Net Income / |Total Income| × 100
 */
export function deriveMetricsFromPnl(rawJson: unknown): MetricEntry[] {
  const rowsObj = rawJson as { Rows?: unknown };
  const flatRows = flattenReportRows(rowsObj?.Rows);
  const entries: MetricEntry[] = [];

  const revenue = findValueByPatternsExcluding(
    flatRows,
    ['total income', 'income', 'total revenue', 'revenue', 'gross sales', 'sales'],
    ['net', 'other', 'operating', 'gross', 'cost']
  );

  const expenses = findValueByPatternsExcluding(
    flatRows,
    ['total expenses', 'expenses'],
    ['other', 'net']
  );

  const netIncome = findValueByPatternsExcluding(
    flatRows,
    ['net income', 'net income (loss)', 'net profit'],
    ['gross', 'operating', 'other', 'ordinary']
  );

  entries.push({ metric_key: 'revenue', value: revenue, unit: 'currency' });
  entries.push({ metric_key: 'expenses', value: expenses, unit: 'currency' });
  entries.push({ metric_key: 'net_income', value: netIncome, unit: 'currency' });

  const profitMarginPct = revenue !== 0 ? (netIncome / Math.abs(revenue)) * 100 : 0;
  entries.push({ metric_key: 'profit_margin_pct', value: Math.round(profitMarginPct * 10) / 10, unit: 'ratio' });

  return entries;
}

/**
 * Extract metrics from Balance Sheet raw JSON.
 *
 * Formulas (aligned with QuickBooks Balance Sheet):
 *   Cash Position        = Bank Accounts Total + Undeposited Funds
 *   Accounts Receivable  = Accounts Receivable (A/R) (accrual basis)
 *   Accounts Payable     = Accounts Payable (A/P)
 */
export function deriveMetricsFromBalanceSheet(rawJson: unknown): MetricEntry[] {
  const rowsObj = rawJson as { Rows?: unknown };
  const flatRows = flattenReportRows(rowsObj?.Rows);
  const entries: MetricEntry[] = [];

  // Cash Position = Bank Accounts Total + Undeposited Funds
  const bankTotal = findValueByPatterns(flatRows, [
    'total bank accounts', 'bank accounts', 'total bank',
  ]);
  const undepositedFunds = findValueByPatterns(flatRows, ['undeposited funds']);
  const cash = bankTotal + undepositedFunds;

  // Accounts Receivable (A/R)
  const ar = findValueByPatternsExcluding(
    flatRows,
    ['total accounts receivable (a/r)', 'accounts receivable (a/r)',
     'total accounts receivable', 'accounts receivable'],
    ['payable']
  );

  // Accounts Payable (A/P)
  const ap = findValueByPatternsExcluding(
    flatRows,
    ['total accounts payable (a/p)', 'accounts payable (a/p)',
     'total accounts payable', 'accounts payable'],
    ['receivable']
  );

  entries.push({ metric_key: 'cash', value: cash, unit: 'currency' });
  entries.push({ metric_key: 'accounts_receivable', value: ar, unit: 'currency' });
  entries.push({ metric_key: 'accounts_payable', value: ap, unit: 'currency' });

  return entries;
}

/**
 * Combine P&L and Balance Sheet derived metrics. Later keys override earlier for same metric_key.
 */
export function deriveMetricsFromReports(
  pnlRaw: unknown,
  balanceSheetRaw: unknown
): MetricEntry[] {
  const byKey = new Map<string, MetricEntry>();
  for (const e of deriveMetricsFromPnl(pnlRaw)) {
    byKey.set(e.metric_key, e);
  }
  for (const e of deriveMetricsFromBalanceSheet(balanceSheetRaw)) {
    byKey.set(e.metric_key, e);
  }
  return Array.from(byKey.values());
}
