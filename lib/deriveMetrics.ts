/**
 * Derive normalized metrics from QuickBooks P&L and Balance Sheet report JSON.
 * Used to populate financial_metrics for dashboard summary and trends.
 */

import {
  extractBalanceSheetTotals,
  extractPnlTotals,
} from '@/lib/metrics/parseQboReport';

export type MetricEntry = { metric_key: string; value: number; unit: 'currency' | 'ratio' | 'count' };

export function deriveMetricsFromPnl(rawJson: unknown): MetricEntry[] {
  const totals = extractPnlTotals(rawJson);
  const entries: MetricEntry[] = [
    { metric_key: 'revenue', value: totals.revenue, unit: 'currency' },
    { metric_key: 'expenses', value: totals.expenses, unit: 'currency' },
    { metric_key: 'net_income', value: totals.net_income, unit: 'currency' },
    { metric_key: 'cogs', value: totals.cogs, unit: 'currency' },
    { metric_key: 'gross_profit', value: totals.gross_profit, unit: 'currency' },
    {
      metric_key: 'profit_margin_pct',
      value: totals.profit_margin_pct,
      unit: 'ratio',
    },
  ];
  if (totals.data_error) {
    entries.push({ metric_key: 'data_error', value: 1, unit: 'count' });
  }
  return entries;
}

export function deriveMetricsFromBalanceSheet(rawJson: unknown): MetricEntry[] {
  const totals = extractBalanceSheetTotals(rawJson);
  return [
    { metric_key: 'cash', value: totals.cash, unit: 'currency' },
    { metric_key: 'accounts_receivable', value: totals.accounts_receivable, unit: 'currency' },
    { metric_key: 'accounts_payable', value: totals.accounts_payable, unit: 'currency' },
    { metric_key: 'current_assets', value: totals.current_assets, unit: 'currency' },
    { metric_key: 'current_liabilities', value: totals.current_liabilities, unit: 'currency' },
    { metric_key: 'inventory', value: totals.inventory, unit: 'currency' },
  ];
}

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
