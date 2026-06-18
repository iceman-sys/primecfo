/**
 * Pull stored financial data for a client + range and compute derived metrics.
 * Used by AI analysis to build context for plain-English insights.
 */

import { getDateRanges, type ReportRange, type PeriodType } from '@/lib/qbo/reports';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { flattenReportRows } from '@/lib/reportUtils';
import { loadSyncedMonthlyCashFlow } from '@/lib/ai/loadSyncedCashFlow';
import { trailingAverageNetCashIncrease } from '@/lib/forecast/parseCashFlowForForecast';
import { pctChange, sumRevenueByKind } from '@/lib/ai/recurringRevenue';

export type RevenueLineItem = { label: string; amount: number };

export type SummaryShape = {
  revenue: number;
  expenses: number;
  net_income: number;
  profit_margin_pct: number;
  cash: number;
  accounts_receivable: number;
  accounts_payable: number;
  data_error?: boolean;
};

export type TrendPoint = {
  periodLabel: string;
  start_date: string;
  end_date: string;
  revenue: number;
  expenses: number;
  profit: number;
  cash: number;
};

export type PnlExtras = {
  ownerCompensation: number | null;
  taxExpense: number | null;
  grossProfit: number | null;
  costOfGoodsSold: number | null;
  revenueLineItems: RevenueLineItem[];
};

export type FinancialContext = {
  periodLabel: string;
  reportRange: ReportRange;
  summary: SummaryShape;
  previousSummary: SummaryShape | null;
  trends: TrendPoint[];
  derived: {
    revenueGrowthPct: number | null;
    expenseGrowthPct: number | null;
    profitMarginChangePct: number | null;
    runwayMonths: number | null;
    netRunwayMonths: number | null;
    trailingNetCashFlow: number | null;
    ownerCompensation: number | null;
    taxExpense: number | null;
    grossMarginPct: number | null;
    operatingLeverageRatio: number | null;
    expenseToRevenueRatio: number | null;
    revenueLineItems: RevenueLineItem[];
    previousRevenueLineItems: RevenueLineItem[];
    recurringRevenueChangePct: number | null;
    dataError: boolean;
  };
};

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

function findByPatterns(rows: { account: string; value: string }[], patterns: string[], exclude: string[] = []): number {
  const normP = patterns.map(normalizeLabel);
  const normE = exclude.map(normalizeLabel);
  let last = 0;
  for (const r of rows) {
    const norm = normalizeLabel(r.account);
    if (normE.some((e) => norm.includes(e))) continue;
    for (const p of normP) {
      if (norm.includes(p) || p.includes(norm)) { last = parseVal(r.value); break; }
    }
  }
  return last;
}

function extractPnlExtras(rawJson: unknown): PnlExtras {
  const rowsObj = rawJson as { Rows?: unknown } | undefined;
  const flatRows = flattenReportRows(rowsObj?.Rows).map((r) => ({ account: r.account, value: r.value }));

  const ownerComp = findByPatterns(flatRows,
    ['officer compensation', 'officers compensation', 'owner pay', 'owner\'s pay', 'owner salary', 'owner compensation', 'owner draw', 'owner\'s draw'],
  );
  const taxExpense = findByPatterns(flatRows,
    ['income tax expense', 'tax expense', 'income taxes', 'provision for income taxes', 'taxes'],
    ['sales tax', 'payroll tax'],
  );
  const grossProfit = findByPatterns(flatRows, ['gross profit', 'gross income']);
  const cogs = findByPatterns(flatRows,
    ['total cost of goods sold', 'cost of goods sold', 'total cogs', 'cogs', 'cost of sales', 'total cost of sales'],
  );

  const revenueLineItems: RevenueLineItem[] = [];
  const normIncome = normalizeLabel('income');
  let inIncomeSection = false;
  for (const r of flatRows) {
    const norm = normalizeLabel(r.account);
    if (norm === normIncome || norm === 'income' || norm === 'revenue') { inIncomeSection = true; continue; }
    if (norm.startsWith('total ') || norm.includes('cost of') || norm.includes('expense')) { inIncomeSection = false; continue; }
    if (inIncomeSection) {
      const amt = parseVal(r.value);
      if (amt !== 0) revenueLineItems.push({ label: r.account, amount: amt });
    }
  }

  return {
    ownerCompensation: ownerComp !== 0 ? ownerComp : null,
    taxExpense: taxExpense !== 0 ? taxExpense : null,
    grossProfit: grossProfit !== 0 ? grossProfit : null,
    costOfGoodsSold: cogs !== 0 ? cogs : null,
    revenueLineItems,
  };
}

const RANGE_LABELS: Record<ReportRange, string> = {
  '3m': 'Last 3 Months',
  '6m': 'Last 6 Months',
  '12m': 'Last 12 Months',
  '4q': 'Last 4 Quarters',
};

export async function getFinancialContext(
  clientId: string,
  range: ReportRange
): Promise<FinancialContext | null> {
  const bundle = await loadClientMetrics(clientId, range);
  if (!bundle.summary) return null;

  const summary: SummaryShape = {
    revenue: bundle.summary.revenue,
    expenses: bundle.summary.expenses,
    net_income: bundle.summary.net_income,
    profit_margin_pct: bundle.summary.profit_margin_pct,
    cash: bundle.summary.cash,
    accounts_receivable: bundle.summary.accounts_receivable,
    accounts_payable: bundle.summary.accounts_payable,
    data_error: bundle.summary.data_error,
  };

  const previousSummary: SummaryShape | null = bundle.previousSummary
    ? {
        revenue: bundle.previousSummary.revenue,
        expenses: bundle.previousSummary.expenses,
        net_income: bundle.previousSummary.net_income,
        profit_margin_pct: bundle.previousSummary.profit_margin_pct,
        cash: bundle.previousSummary.cash,
        accounts_receivable: bundle.previousSummary.accounts_receivable,
        accounts_payable: bundle.previousSummary.accounts_payable,
        data_error: bundle.previousSummary.data_error,
      }
    : null;

  const trends: TrendPoint[] = bundle.trends.map((t) => ({
    periodLabel: t.periodLabel,
    start_date: t.start_date ?? '',
    end_date: t.end_date ?? '',
    revenue: t.revenue,
    expenses: t.expenses,
    profit: t.profit,
    cash: t.cash,
  }));

  const revenueGrowthPct =
    previousSummary && previousSummary.revenue !== 0
      ? ((summary.revenue - previousSummary.revenue) / Math.abs(previousSummary.revenue)) * 100
      : null;
  const expenseGrowthPct =
    previousSummary && previousSummary.expenses !== 0
      ? ((summary.expenses - previousSummary.expenses) / Math.abs(previousSummary.expenses)) * 100
      : null;
  const profitMarginChangePct =
    previousSummary != null
      ? summary.profit_margin_pct - previousSummary.profit_margin_pct
      : null;

  const periodType: PeriodType = range === '4q' ? 'quarter' : 'month';
  const rangeInfos = getDateRanges(range, periodType);
  const windowPeriods = bundle.periods.filter((p) =>
    rangeInfos.some((r) => r.start_date === p.start_date)
  );
  const latestPeriodId = windowPeriods.length
    ? windowPeriods[windowPeriods.length - 1].id
    : bundle.periods[bundle.periods.length - 1]?.id;

  let extras: PnlExtras | null = null;
  let previousExtras: PnlExtras | null = null;
  const previousPeriodId =
    windowPeriods.length >= 2 ? windowPeriods[windowPeriods.length - 2].id : null;

  if (latestPeriodId || previousPeriodId) {
    const sb = supabaseAdmin();
    const periodIds = [latestPeriodId, previousPeriodId].filter(Boolean) as string[];
    const { data: pnlReports } = await sb
      .from('financial_reports')
      .select('period_id, raw_json')
      .eq('client_id', clientId)
      .in('period_id', periodIds)
      .eq('report_type', 'pnl');

    for (const row of pnlReports ?? []) {
      if (!row.raw_json) continue;
      if (row.period_id === latestPeriodId) extras = extractPnlExtras(row.raw_json);
      if (row.period_id === previousPeriodId) previousExtras = extractPnlExtras(row.raw_json);
    }
  }

  const grossMarginPct =
    bundle.summary.gross_profit !== 0 && summary.revenue !== 0
      ? (bundle.summary.gross_profit / Math.abs(summary.revenue)) * 100
      : extras?.grossProfit != null && summary.revenue !== 0
        ? (extras.grossProfit / Math.abs(summary.revenue)) * 100
        : null;

  const expenseToRevenueRatio =
    summary.revenue !== 0 ? (summary.expenses / Math.abs(summary.revenue)) * 100 : null;

  const operatingLeverageRatio =
    extras?.grossProfit != null && summary.net_income !== 0
      ? extras.grossProfit / summary.net_income
      : null;

  const cashFlowRaw = await loadSyncedMonthlyCashFlow(clientId);
  const trailingNetCashFlow = cashFlowRaw
    ? trailingAverageNetCashIncrease(cashFlowRaw, 3)
    : null;

  const netRunwayMonths =
    trailingNetCashFlow != null && trailingNetCashFlow < 0 && summary.cash > 0
      ? summary.cash / Math.abs(trailingNetCashFlow)
      : null;

  const revenueLineItems = extras?.revenueLineItems ?? [];
  const previousRevenueLineItems = previousExtras?.revenueLineItems ?? [];
  const recurringNow = sumRevenueByKind(revenueLineItems, 'recurring');
  const recurringPrev = sumRevenueByKind(previousRevenueLineItems, 'recurring');
  const recurringRevenueChangePct = pctChange(recurringPrev, recurringNow);

  return {
    periodLabel: RANGE_LABELS[range],
    reportRange: range,
    summary,
    previousSummary,
    trends,
    derived: {
      revenueGrowthPct,
      expenseGrowthPct,
      profitMarginChangePct,
      runwayMonths: bundle.runway.runwayMonths,
      netRunwayMonths,
      trailingNetCashFlow,
      ownerCompensation: extras?.ownerCompensation ?? null,
      taxExpense: extras?.taxExpense ?? null,
      grossMarginPct: grossMarginPct != null ? Math.round(grossMarginPct * 10) / 10 : null,
      operatingLeverageRatio: operatingLeverageRatio != null ? Math.round(operatingLeverageRatio * 100) / 100 : null,
      expenseToRevenueRatio: expenseToRevenueRatio != null ? Math.round(expenseToRevenueRatio * 10) / 10 : null,
      revenueLineItems,
      previousRevenueLineItems,
      recurringRevenueChangePct,
      dataError: summary.data_error ?? false,
    },
  };
}
