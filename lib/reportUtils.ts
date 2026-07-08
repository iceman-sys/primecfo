/**
 * Shared helpers for flattening and displaying QuickBooks report JSON (P&L, Balance Sheet, etc.).
 * Handles Summary, Header, and ColData; supports both value and Value (QBO casing).
 */

export type FlatReportRow = { account: string; value: string; depth: number; isBold: boolean };

/**
 * Convert QuickBooks camelCase account names to readable titles (e.g. TotalAssets → Total Assets).
 */
export function humanizeAccountLabel(account: string): string {
  if (!account?.trim()) return account ?? '';
  return account
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

type ColDataItem = { value?: string; Value?: string } | Record<string, unknown>;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatReportValue(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (trimmed === undefined || trimmed === '' || trimmed === '-') return '-';
  let cleaned = String(trimmed).replace(/[$,]/g, '');
  let isNeg = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = cleaned.slice(1, -1);
    isNeg = true;
  }
  const num = parseFloat(cleaned);
  if (!Number.isNaN(num)) return formatCurrency(isNeg ? -Math.abs(num) : num);
  return trimmed;
}

/** Get string value from a ColData item (supports value and Value; handles number type from API). */
function getColDataItemValue(col: ColDataItem | undefined): string {
  if (col == null) return '';
  const v = (col as { value?: string | number }).value ?? (col as { Value?: string | number }).Value;
  if (v === undefined || v === null) return '';
  const s = typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
  return s.trim();
}

/**
 * Pick the first numeric value from ColData (supports value/Value and $, comma formats).
 */
export function pickNumericColValue(colData: ColDataItem[] | undefined): string {
  if (!colData?.length) return '';
  for (const col of colData) {
    const v = getColDataItemValue(col);
    if (!v || v === '-') continue;
    let cleaned = String(v).replace(/[$,]/g, '');
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) cleaned = '-' + cleaned.slice(1, -1);
    const num = parseFloat(cleaned);
    if (!Number.isNaN(num)) return v;
  }
  return '';
}

/** Get last column value from ColData as fallback (label or amount). */
function getLastColValue(colData: ColDataItem[] | undefined): string {
  if (!colData?.length) return '';
  return getColDataItemValue(colData[colData.length - 1]);
}

/**
 * Extract numeric/value from a QuickBooks row by checking Summary → Header → ColData.
 * Handles Summary as object or array (Summary[0].ColData).
 */
function getRowValue(r: Record<string, unknown>): string {
  const summary = r.Summary;
  let summaryCols: ColDataItem[] | undefined;
  if (summary != null) {
    if (Array.isArray(summary) && summary[0] != null) {
      summaryCols = (summary[0] as { ColData?: ColDataItem[] }).ColData;
    } else {
      summaryCols = (summary as { ColData?: ColDataItem[] }).ColData;
    }
  }
  const headerCols = (r.Header as { ColData?: ColDataItem[] } | undefined)?.ColData;
  const colData = r.ColData as ColDataItem[] | undefined;

  const fromSummary = pickNumericColValue(summaryCols) || getLastColValue(summaryCols);
  if (fromSummary) return fromSummary;

  const fromHeader = pickNumericColValue(headerCols) || getLastColValue(headerCols);
  if (fromHeader) return fromHeader;

  const fromColData = pickNumericColValue(colData) || getLastColValue(colData);
  return fromColData;
}

export function flattenReportRows(rows: unknown, depth = 0): FlatReportRow[] {
  const result: FlatReportRow[] = [];
  const rowsObj = rows as { Row?: unknown[] } | undefined;
  if (!rowsObj?.Row || !Array.isArray(rowsObj.Row)) return result;

  for (const row of rowsObj.Row) {
    const r = row as Record<string, unknown>;
    const headerCols = (r.Header as { ColData?: ColDataItem[] } | undefined)?.ColData;
    const groupName = (r.group as string) ?? getColDataItemValue(headerCols?.[0]) ?? '';
    const hasNestedRows = r.Rows && typeof r.Rows === 'object';

    if (hasNestedRows) {
      // Group title row: show value only from Header (avoid duplicating Summary total on next line)
      const groupValue = groupName
        ? pickNumericColValue(headerCols) || getLastColValue(headerCols)
        : '';
      if (groupName) {
        result.push({
          account: groupName,
          value: formatReportValue(groupValue || undefined),
          depth,
          isBold: true,
        });
      }
      result.push(...flattenReportRows(r.Rows, depth + (groupName ? 1 : 0)));
      const summaryCols = (r.Summary as { ColData?: ColDataItem[] } | undefined)?.ColData;
      const summaryArr = Array.isArray(r.Summary) ? (r.Summary as { ColData?: ColDataItem[] }[])[0]?.ColData : undefined;
      const summaryColsUsed = summaryCols ?? summaryArr;
      if (summaryColsUsed?.length) {
        const label = getColDataItemValue(summaryColsUsed[0]) || `Total ${groupName}`;
        const val = getRowValue(r);
        result.push({ account: label, value: formatReportValue(val || undefined), depth, isBold: true });
      }
    } else if (r.type === 'Data' && Array.isArray(r.ColData)) {
      const cols = r.ColData as ColDataItem[];
      const label = getColDataItemValue(cols[0]) ?? '';
      const val = getRowValue(r);
      result.push({ account: label, value: formatReportValue(val || undefined), depth, isBold: false });
    } else if (groupName) {
      const val = getRowValue(r);
      result.push({ account: groupName, value: formatReportValue(val || undefined), depth, isBold: true });
    }
  }
  return result;
}

/** ─── Financial Reports spec (May 2026): multi-period + accounting display ───────────────── */

/** USD with no cents; negatives parenthesized */
export function formatAccountingUsdWhole(amount: number): string {
  const absRounded = Math.abs(Math.round(amount));
  const core = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absRounded);
  if (amount < 0) return `(${core})`;
  return core;
}

function qbNumericStringToNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '—') return 0;
  let cleaned = trimmed.replace(/[$,]/g, '');
  let neg = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = cleaned.slice(1, -1).trim();
    neg = true;
  }
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return neg ? -Math.abs(n) : n;
}

/** QB cell → $0 zeros, parens negatives, no cents */
export function formatAccountingDisplayFromQbCell(raw: string | undefined): string {
  const n = qbNumericStringToNumber(raw);
  if (n === null) return '$0';
  return formatAccountingUsdWhole(n);
}

export type FlatMultiPeriodRow = {
  account: string;
  values: string[];
  depth: number;
  isBold: boolean;
  rowKind: 'detail' | 'sectionHeader' | 'subtotal' | 'grandTotal';
};

import { extractColumnPeriodLabels } from '@/lib/reporting/columnLabels';

export function extractColumnTitles(rawJson: Record<string, unknown>): string[] {
  const cols = rawJson.Columns as { Column?: Array<Record<string, unknown>> } | undefined;
  const column = cols?.Column;
  if (!Array.isArray(column) || column.length < 2) return [];
  return extractColumnPeriodLabels(column as Parameters<typeof extractColumnPeriodLabels>[0]);
}

function classifyFinancialRow(account: string, isBold: boolean): FlatMultiPeriodRow['rowKind'] {
  const a = account.trim().toLowerCase();
  if (/^total liabilities & equity|^total liabilities and equity|^net assets$/.test(a)) return 'grandTotal';
  if (
    /^net income$/.test(a) ||
    /^net operating income$/.test(a) ||
    /^net other income$/.test(a) ||
    /^ending cash\b/.test(a) ||
    /^beginning cash\b/.test(a) ||
    /^net change in cash$/.test(a)
  )
    return 'grandTotal';
  if (/^total\b/.test(a) && isBold) return 'subtotal';
  if (isBold) return 'sectionHeader';
  return 'detail';
}

function padPeriodAmounts(vals: string[], periodCount: number): string[] {
  const out = [...vals];
  while (out.length < periodCount) out.push('$0');
  return out.slice(0, periodCount);
}

/** ColData slot 0 = row label; next slots = period amounts. */
function slicePeriodAmounts(cd: ColDataItem[] | undefined, periodCount: number): string[] {
  if (periodCount <= 0 || !cd?.length) return padPeriodAmounts([], Math.max(periodCount, 0));
  if (cd.length < 2) return Array.from({ length: periodCount }, () => '$0');
  const cells = cd.slice(1, 1 + Math.min(periodCount, cd.length - 1)).map((c) =>
    formatAccountingDisplayFromQbCell(getColDataItemValue(c))
  );
  return padPeriodAmounts(cells, periodCount);
}

export function scanFirstColDataLengths(rows: unknown): number {
  let maxLen = 0;
  const visit = (r: Record<string, unknown>) => {
    if (r.type === 'Data' && Array.isArray(r.ColData)) maxLen = Math.max(maxLen, r.ColData.length);
    const nested = r.Rows as { Row?: unknown[] } | undefined;
    if (!nested?.Row) return;
    for (const child of nested.Row) visit(child as Record<string, unknown>);
  };
  const root = rows as { Row?: unknown[] } | undefined;
  if (!root?.Row) return 0;
  for (const row of root.Row) visit(row as Record<string, unknown>);
  return maxLen;
}

/** Multi-period line items × time columns (QB `summarize_column_by`). Fallback: single Totals column via legacy flatten. */
export function flattenReportRowsMulti(rawJson: Record<string, unknown>, maxCols = 32): {
  columnTitles: string[];
  rows: FlatMultiPeriodRow[];
} {
  let titles = extractColumnTitles(rawJson);
  const inferredFromData = scanFirstColDataLengths(rawJson.Rows);

  /** Period slots = (# ColData − label). Prefer Columns headings. */
  const periodGuess = titles.length
    ? titles.length
    : Math.min(maxCols, Math.max(inferredFromData - 1, inferredFromData > 2 ? inferredFromData - 1 : 1));

  if (!titles.length && periodGuess >= 2)
    titles = Array.from({ length: periodGuess }, (_, i) => `Period ${i + 1}`);
  while (titles.length < periodGuess) titles.push(`Column ${titles.length + 1}`);
  titles = titles.slice(0, periodGuess);

  let periodCount = Math.min(maxCols, titles.length || periodGuess || 1);
  if (periodCount < 1) periodCount = 1;

  const result: FlatMultiPeriodRow[] = [];

  const walk = (nodes: unknown, depth: number) => {
    const rowsObj = nodes as { Row?: unknown[] };
    if (!rowsObj.Row || !Array.isArray(rowsObj.Row)) return;

    for (const row of rowsObj.Row) {
      const r = row as Record<string, unknown>;
      const headerCols = (r.Header as { ColData?: ColDataItem[] })?.ColData;
      const groupName = (r.group as string) ?? getColDataItemValue(headerCols?.[0]) ?? '';
      const nested = r.Rows as { Row?: unknown[] } | undefined;
      const hasNested = nested?.Row !== undefined && Array.isArray(nested.Row);

      if (hasNested) {
        if (groupName) {
          result.push({
            account: humanizeAccountLabel(groupName),
            values: padPeriodAmounts(slicePeriodAmounts(headerCols, periodCount), periodCount),
            depth,
            isBold: true,
            rowKind: 'sectionHeader',
          });
          walk(nested, depth + 1);

          const summaryCols =
            ((r.Summary as { ColData?: ColDataItem[] })?.ColData) ??
            (Array.isArray(r.Summary)
              ? (r.Summary[0] as { ColData?: ColDataItem[] })?.ColData
              : undefined);
          if (summaryCols?.length) {
            const totalLabel = humanizeAccountLabel(
              getColDataItemValue(summaryCols[0]) || `Total ${groupName}`
            );
            let vals = slicePeriodAmounts(summaryCols, periodCount);
            const rkClass = classifyFinancialRow(totalLabel, true);
            const rk: FlatMultiPeriodRow['rowKind'] =
              rkClass === 'grandTotal' ? 'grandTotal' : 'subtotal';
            result.push({
              account: totalLabel,
              values: padPeriodAmounts(vals, periodCount),
              depth,
              isBold: true,
              rowKind: rk,
            });
          }
        } else walk(nested, depth);
      } else if (!hasNested) {
        const summaryCols =
          ((r.Summary as { ColData?: ColDataItem[] })?.ColData) ??
          (Array.isArray(r.Summary)
            ? (r.Summary[0] as { ColData?: ColDataItem[] })?.ColData
            : undefined);

        if (summaryCols?.length) {
          const totalLabel = humanizeAccountLabel(
            getColDataItemValue(summaryCols[0]) || humanizeAccountLabel(groupName) || 'Total'
          );
          const vals = slicePeriodAmounts(summaryCols, periodCount);
          const rkClass = classifyFinancialRow(totalLabel, true);
          const rk: FlatMultiPeriodRow['rowKind'] =
            rkClass === 'grandTotal' ? 'grandTotal' : 'subtotal';
          result.push({
            account: totalLabel,
            values: padPeriodAmounts(vals, periodCount),
            depth,
            isBold: true,
            rowKind: rk,
          });
        } else if (r.type === 'Data' && Array.isArray(r.ColData)) {
          const cols = r.ColData as ColDataItem[];
          const label = humanizeAccountLabel(getColDataItemValue(cols[0]) ?? '');
          let rk = classifyFinancialRow(label, false);
          if (rk === 'grandTotal' || rk === 'subtotal' || rk === 'sectionHeader') rk = 'detail';
          result.push({
            account: label,
            values: padPeriodAmounts(slicePeriodAmounts(cols, periodCount), periodCount),
            depth,
            isBold: false,
            rowKind: rk,
          });
        } else if (groupName) {
          const headerVals = slicePeriodAmounts(headerCols, periodCount);
          const hasAmounts = headerVals.some((v) => v !== '$0');
          result.push({
            account: humanizeAccountLabel(groupName),
            values: padPeriodAmounts(hasAmounts ? headerVals : [], periodCount),
            depth,
            isBold: true,
            rowKind: classifyFinancialRow(groupName, true),
          });
        }
      }
    }
  };

  walk(rawJson.Rows, 0);

  if (result.length === 0) {
    const single = flattenReportRows((rawJson as { Rows?: unknown }).Rows).slice(0, 400);
    if (single.length)
      return {
        columnTitles: ['Total'],
        rows: single.map((fr) => ({
          account: fr.account,
          values: [
            formatAccountingDisplayFromQbCell(
              fr.value === '-' || fr.value === '—' ? '0' : String(fr.value)
            ),
          ],
          depth: fr.depth,
          isBold: fr.isBold,
          rowKind:
            classifyFinancialRow(fr.account, fr.isBold) === 'grandTotal'
              ? ('grandTotal' as const)
              : fr.isBold
                ? ('subtotal' as const)
                : ('detail' as const),
        })),
      };
  }

  return { columnTitles: titles.slice(0, periodCount), rows: result };
}

/** True when Net Income rows are all zero but expense subtotals show material amounts. */
export function detectPnlNetIncomeAnomaly(rows: FlatMultiPeriodRow[]): boolean {
  const netRows = rows.filter((r) => /^net income$/i.test(r.account.trim()) || /^net operating income$/i.test(r.account.trim()));
  if (netRows.length === 0) return false;

  const expenseRows = rows.filter(
    (r) => /total expenses/i.test(r.account) || /^total for expenses$/i.test(r.account.trim())
  );
  const hasExpenseTotals = expenseRows.some((r) =>
    r.values.some((v) => {
      const n = qbNumericStringToNumber(v);
      return n != null && Math.abs(n) > 0;
    })
  );
  if (!hasExpenseTotals) return false;

  const netAllZero = netRows.every((r) => r.values.every((v) => v === '$0' || v === '-' || v === '—'));
  return netAllZero;
}
