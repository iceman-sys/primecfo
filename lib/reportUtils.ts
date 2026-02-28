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
        ? (pickNumericColValue(headerCols) || getLastColValue(headerCols))
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
