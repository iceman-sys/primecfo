/**
 * Extract authoritative totals from QuickBooks report JSON (P&L, Balance Sheet).
 * Prefers section Summary / grand-total rows over line items.
 */

import { pickNumericColValue, scanFirstColDataLengths } from '@/lib/reportUtils';

type ColDataItem = { value?: string | number; Value?: string | number };

function getColDataItemValue(col: ColDataItem | undefined): string {
  if (col == null) return '';
  const v = col.value ?? col.Value;
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

export function parseAmount(raw: string | undefined): number {
  if (raw === undefined || raw === null || raw === '' || raw === '-' || raw === '—') return 0;
  let cleaned = String(raw).replace(/[$,]/g, '').trim();
  const wrapped = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (wrapped) cleaned = cleaned.slice(1, -1).trim();
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  return wrapped ? -Math.abs(num) : num;
}

export function normalizeReportLabel(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveColumnIndex(rawJson: Record<string, unknown>, columnIndex: number): number {
  if (columnIndex >= 0) return columnIndex;
  const inferred = scanFirstColDataLengths(rawJson.Rows);
  const cols = rawJson.Columns as { Column?: unknown[] } | undefined;
  const titleCount = Array.isArray(cols?.Column) ? Math.max(cols!.Column!.length - 1, 1) : 1;
  const periodSlots = Math.max(inferred - 1, titleCount, 1);
  return periodSlots; // last data column (Totals)
}

function getRowAmountAtColumn(row: Record<string, unknown>, colIndex: number): number {
  const summary = row.Summary;
  let summaryCols: ColDataItem[] | undefined;
  if (summary != null) {
    if (Array.isArray(summary) && summary[0] != null) {
      summaryCols = (summary[0] as { ColData?: ColDataItem[] }).ColData;
    } else {
      summaryCols = (summary as { ColData?: ColDataItem[] }).ColData;
    }
  }
  const headerCols = (row.Header as { ColData?: ColDataItem[] } | undefined)?.ColData;
  const colData = row.ColData as ColDataItem[] | undefined;

  const pickAt = (cols: ColDataItem[] | undefined): number => {
    if (!cols?.length) return 0;
    const idx = Math.min(colIndex, cols.length - 1);
    if (idx < 1 && cols.length > 1) {
      return parseAmount(getColDataItemValue(cols[cols.length - 1]));
    }
    return parseAmount(getColDataItemValue(cols[idx]));
  };

  if (summaryCols?.length) {
    const v = pickAt(summaryCols);
    if (v !== 0) return v;
    const fromSummary = pickNumericColValue(summaryCols);
    if (fromSummary) return parseAmount(fromSummary);
  }
  if (headerCols?.length) {
    const v = pickAt(headerCols);
    if (v !== 0) return v;
  }
  if (colData?.length) {
    const v = pickAt(colData);
    if (v !== 0) return v;
  }
  return 0;
}

type LabeledAmount = { label: string; norm: string; amount: number; priority: number };

const PNL_REVENUE_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total income$/i, /^total revenue$/i, /^net revenue$/i], priority: 100 },
  { patterns: [/^total for income$/i, /^total sales$/i], priority: 90 },
  { patterns: [/^gross sales$/i], priority: 50 },
];

const PNL_NET_INCOME_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^net income$/i, /^net income \(loss\)$/i, /^net profit$/i], priority: 100 },
];

const PNL_EXPENSE_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total expenses$/i, /^total operating expenses$/i], priority: 100 },
  { patterns: [/^total for expenses$/i], priority: 90 },
];

const PNL_COGS_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total cost of goods sold$/i, /^total cogs$/i, /^cost of goods sold$/i], priority: 100 },
];

const PNL_GROSS_PROFIT_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^gross profit$/i, /^gross income$/i], priority: 100 },
];

const BS_CASH_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total bank accounts$/i, /^cash and cash equivalents$/i], priority: 100 },
  { patterns: [/^bank accounts$/i], priority: 80 },
];

const BS_AR_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total accounts receivable/i, /^accounts receivable \(a\/r\)$/i], priority: 100 },
];

const BS_AP_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total accounts payable/i, /^accounts payable \(a\/p\)$/i], priority: 100 },
];

const BS_CURRENT_ASSETS_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total current assets$/i], priority: 100 },
];

const BS_CURRENT_LIAB_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total current liabilities$/i], priority: 100 },
];

const BS_INVENTORY_RULES: Array<{ patterns: RegExp[]; priority: number }> = [
  { patterns: [/^total inventory$/i, /^inventory$/i], priority: 100 },
];

function scoreLabel(norm: string, rules: Array<{ patterns: RegExp[]; priority: number }>): number {
  let best = 0;
  for (const rule of rules) {
    for (const p of rule.patterns) {
      if (p.test(norm)) best = Math.max(best, rule.priority);
    }
  }
  return best;
}

function collectLabeledAmounts(
  rows: unknown,
  colIndex: number,
  depth = 0
): LabeledAmount[] {
  const out: LabeledAmount[] = [];
  const rowsObj = rows as { Row?: unknown[] } | undefined;
  if (!rowsObj?.Row || !Array.isArray(rowsObj.Row)) return out;

  for (const row of rowsObj.Row) {
    const r = row as Record<string, unknown>;
    const headerCols = (r.Header as { ColData?: ColDataItem[] } | undefined)?.ColData;
    const groupName = (r.group as string) ?? getColDataItemValue(headerCols?.[0]) ?? '';
    const nested = r.Rows as { Row?: unknown[] } | undefined;
    const hasNested = nested?.Row !== undefined;

    const summaryCols =
      ((r.Summary as { ColData?: ColDataItem[] })?.ColData) ??
      (Array.isArray(r.Summary)
        ? (r.Summary[0] as { ColData?: ColDataItem[] })?.ColData
        : undefined);

    const labels: string[] = [];
    if (summaryCols?.length) {
      labels.push(getColDataItemValue(summaryCols[0]) || `Total ${groupName}`);
    }
    if (groupName) labels.push(groupName);
    if (r.type === 'Data' && Array.isArray(r.ColData)) {
      labels.push(getColDataItemValue((r.ColData as ColDataItem[])[0]));
    }

    const amount = getRowAmountAtColumn(r, colIndex);
    for (const label of labels) {
      const norm = normalizeReportLabel(label);
      if (!norm) continue;
      out.push({ label, norm, amount, priority: 0 });
    }

    if (hasNested) out.push(...collectLabeledAmounts(nested, colIndex, depth + 1));
  }
  return out;
}

function pickBestAmount(
  items: LabeledAmount[],
  rules: Array<{ patterns: RegExp[]; priority: number }>
): number {
  let bestScore = 0;
  let bestAmount = 0;
  for (const item of items) {
    const score = scoreLabel(item.norm, rules);
    if (score > bestScore) {
      bestScore = score;
      bestAmount = item.amount;
    } else if (score === bestScore && score > 0 && Math.abs(item.amount) > Math.abs(bestAmount)) {
      bestAmount = item.amount;
    }
  }
  return bestAmount;
}

export type PnlTotals = {
  revenue: number;
  expenses: number;
  net_income: number;
  cogs: number;
  gross_profit: number;
  profit_margin_pct: number;
  data_error: boolean;
};

export type BalanceSheetTotals = {
  cash: number;
  accounts_receivable: number;
  accounts_payable: number;
  current_assets: number;
  current_liabilities: number;
  inventory: number;
};

export function extractPnlTotals(rawJson: unknown, columnIndex = -1): PnlTotals {
  const json = (rawJson ?? {}) as Record<string, unknown>;
  const col = resolveColumnIndex(json, columnIndex);
  const items = collectLabeledAmounts(json.Rows, col);

  const revenue = pickBestAmount(items, PNL_REVENUE_RULES);
  let expenses = pickBestAmount(items, PNL_EXPENSE_RULES);
  const net_income = pickBestAmount(items, PNL_NET_INCOME_RULES);
  const cogs = pickBestAmount(items, PNL_COGS_RULES);
  let gross_profit = pickBestAmount(items, PNL_GROSS_PROFIT_RULES);
  if (gross_profit === 0 && revenue !== 0 && cogs !== 0) {
    gross_profit = revenue - Math.abs(cogs);
  }

  if (expenses === 0 && revenue !== 0 && net_income !== 0) {
    expenses = revenue - net_income;
  }

  let profit_margin_pct = 0;
  let data_error = false;
  if (Math.abs(revenue) > 0) {
    profit_margin_pct = Math.round((net_income / Math.abs(revenue)) * 1000) / 10;
    if (Math.abs(profit_margin_pct) > 100 || Math.abs(revenue) < 100) {
      data_error = true;
      console.error('[metrics] P&L sanity check failed', {
        revenue,
        net_income,
        profit_margin_pct,
        col,
      });
    }
  }

  return {
    revenue,
    expenses,
    net_income,
    cogs,
    gross_profit,
    profit_margin_pct: data_error ? 0 : profit_margin_pct,
    data_error,
  };
}

export function extractBalanceSheetTotals(
  rawJson: unknown,
  columnIndex = -1
): BalanceSheetTotals {
  const json = (rawJson ?? {}) as Record<string, unknown>;
  const col = resolveColumnIndex(json, columnIndex);
  const items = collectLabeledAmounts(json.Rows, col);

  const bankTotal = pickBestAmount(items, BS_CASH_RULES);
  const undeposited = items.find((i) => i.norm === 'undeposited funds')?.amount ?? 0;

  return {
    cash: bankTotal + undeposited,
    accounts_receivable: pickBestAmount(items, BS_AR_RULES),
    accounts_payable: pickBestAmount(items, BS_AP_RULES),
    current_assets: pickBestAmount(items, BS_CURRENT_ASSETS_RULES),
    current_liabilities: pickBestAmount(items, BS_CURRENT_LIAB_RULES),
    inventory: pickBestAmount(items, BS_INVENTORY_RULES),
  };
}
