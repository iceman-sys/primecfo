/**
 * Pull stored financial data for a client + range and compute derived metrics.
 * Used by AI analysis to build context for plain-English insights.
 */

import type { ReportRange } from '@/lib/qbo/reports';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { computeAnalyticsKpis } from '@/lib/metrics/ratios';
import { loadIntegratedReportRaw } from '@/lib/metrics/loadIntegratedReport';
import { loadTrailingNetCashFlow } from '@/lib/metrics/cashFlowMetrics';
import { periodMonthsForRange } from '@/lib/metrics/periodMonths';
import {
  annualizeEbitda,
  computePeriodEbitda,
} from '@/lib/metrics/ebitda';
import {
  extractPnlExtrasFromRaw,
  extractPriorColumnRevenueLineItems,
  mergeOwnerCompensation,
} from '@/lib/ai/extractPnlExtras';
import { extractBalanceSheetSnapshot } from '@/lib/ai/extractBalanceSheet';
import {
  buildBalanceSheetInsightInput,
  type BalanceSheetContext,
} from '@/lib/ai/balanceSheetContext';
import { computeDebtServiceCoverage } from '@/lib/ai/balanceSheetInsights';
import type { BalanceSheetInsightInput } from '@/lib/ai/balanceSheetInsights';
import {
  extractInterestExpense,
  extractFinancingPrincipalPayments,
  extractNetOperatingIncome,
  extractDepreciationAmortization,
  extractIncomeTaxExpense,
  extractOperatingCashFlow,
  extractOwnerDrawsFromCashFlow,
} from '@/lib/ai/extractReportExtras';
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
    debtToEbitda: number | null;
    debtServiceCoverage: number | null;
    incrementalMarginPct: number | null;
    dataError: boolean;
    excludedPartialMonth: boolean;
  };
  balanceSheet: BalanceSheetInsightInput | null;
  balanceSheetContext: BalanceSheetContext | null;
};

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

  const completeTrends = bundle.lastReconciledDate
    ? trends.filter((t) => {
        if (!t.end_date) return true;
        const end = new Date(`${t.end_date.slice(0, 10)}T23:59:59`);
        const reconEnd = new Date(
          bundle.lastReconciledDate!.getFullYear(),
          bundle.lastReconciledDate!.getMonth(),
          bundle.lastReconciledDate!.getDate(),
          23,
          59,
          59,
          999
        );
        return end <= reconEnd;
      })
    : trends;
  const trendsForAnalysis = completeTrends.length >= 2 ? completeTrends : trends;

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

  const [integratedPnlRaw, integratedBsRaw, integratedCfRaw, trailingNetCashFlow] = await Promise.all([
    loadIntegratedReportRaw(clientId, range, 'pnl'),
    loadIntegratedReportRaw(clientId, range, 'balance_sheet'),
    loadIntegratedReportRaw(clientId, range, 'cash_flow'),
    loadTrailingNetCashFlow(clientId, range),
  ]);

  const pnlExtract = integratedPnlRaw ? extractPnlExtrasFromRaw(integratedPnlRaw) : null;
  const ownerCompensation = pnlExtract ? mergeOwnerCompensation(pnlExtract) : null;

  const extras: PnlExtras | null = pnlExtract
    ? {
        ownerCompensation,
        taxExpense: pnlExtract.taxExpense,
        grossProfit: pnlExtract.grossProfit,
        costOfGoodsSold: pnlExtract.costOfGoodsSold,
        revenueLineItems: pnlExtract.revenueLineItems,
      }
    : null;

  const revenueLineItems = extras?.revenueLineItems ?? [];
  const previousRevenueLineItems = integratedPnlRaw
    ? extractPriorColumnRevenueLineItems(integratedPnlRaw)
    : [];

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

  const netRunwayMonths =
    trailingNetCashFlow != null && trailingNetCashFlow < 0 && summary.cash > 0
      ? summary.cash / Math.abs(trailingNetCashFlow)
      : null;

  const recurringNow = sumRevenueByKind(revenueLineItems, 'recurring');
  const recurringPrev = sumRevenueByKind(previousRevenueLineItems, 'recurring');
  const recurringRevenueChangePct = pctChange(recurringPrev, recurringNow);

  const bsSnapshot = integratedBsRaw ? extractBalanceSheetSnapshot(integratedBsRaw) : null;
  if (bsSnapshot) {
    const kpis = computeAnalyticsKpis(bundle.summary, trends, bundle.runway.runwayMonths, range);
    if (bsSnapshot.currentRatio == null) bsSnapshot.currentRatio = kpis.currentRatio;
    if (
      bsSnapshot.quickRatio == null &&
      bsSnapshot.cash != null &&
      bsSnapshot.accountsReceivable != null &&
      bsSnapshot.currentLiabilities != null &&
      bsSnapshot.currentLiabilities !== 0
    ) {
      bsSnapshot.quickRatio =
        Math.round(
          ((bsSnapshot.cash + bsSnapshot.accountsReceivable) /
            Math.abs(bsSnapshot.currentLiabilities)) *
            100
        ) / 100;
    } else if (bsSnapshot.quickRatio == null) {
      bsSnapshot.quickRatio = kpis.quickRatio;
    }
  }
  const interestExpenseTotal = integratedPnlRaw ? extractInterestExpense(integratedPnlRaw) : null;
  const netOperatingIncome = integratedPnlRaw ? extractNetOperatingIncome(integratedPnlRaw) : null;
  const depreciationAmortization = integratedPnlRaw
    ? extractDepreciationAmortization(integratedPnlRaw)
    : null;
  const incomeTaxExpense = integratedPnlRaw ? extractIncomeTaxExpense(integratedPnlRaw) : null;
  const financingPrincipalTotal = integratedCfRaw
    ? extractFinancingPrincipalPayments(integratedCfRaw)
    : null;
  const operatingCashFlow = integratedCfRaw ? extractOperatingCashFlow(integratedCfRaw) : null;
  const ownerDraws = integratedCfRaw ? extractOwnerDrawsFromCashFlow(integratedCfRaw) : null;

  const periodMonths = periodMonthsForRange(range);
  const monthlyOperatingCash =
    trailingNetCashFlow ??
    (summary.net_income !== 0 ? summary.net_income / periodMonths : null);

  const periodEbitda = computePeriodEbitda({
    netOperatingIncome,
    interestExpense: interestExpenseTotal,
    depreciationAmortization,
    incomeTaxExpense,
    netIncomeFallback: summary.net_income,
  });
  const annualizedEbitda = periodEbitda != null ? annualizeEbitda(periodEbitda, periodMonths) : null;

  const balanceSheet = buildBalanceSheetInsightInput(
    range,
    bsSnapshot,
    interestExpenseTotal,
    financingPrincipalTotal,
    monthlyOperatingCash,
    periodEbitda,
    annualizedEbitda,
    netOperatingIncome,
    operatingCashFlow,
    ownerDraws,
    summary.accounts_receivable
  );

  const debtServiceCoverage = balanceSheet ? computeDebtServiceCoverage(balanceSheet) : null;

  const deltaRev = previousSummary ? summary.revenue - previousSummary.revenue : 0;
  const deltaNi = previousSummary ? summary.net_income - previousSummary.net_income : 0;
  const incrementalMarginPct =
    previousSummary && Math.abs(deltaRev) >= 1 ? (deltaNi / deltaRev) * 100 : null;

  const balanceSheetContext: BalanceSheetContext | null =
    bsSnapshot && balanceSheet
      ? {
          snapshot: bsSnapshot,
          periodMonths,
          interestExpenseTotal,
          financingPrincipalTotal,
          monthlyOperatingCash,
          netOperatingIncome,
          operatingCashFlow,
          periodEbitda,
          annualizedEbitda,
          debtToEbitda: balanceSheet.debtToEbitda,
        }
      : null;

  return {
    periodLabel: RANGE_LABELS[range],
    reportRange: range,
    summary,
    previousSummary,
    trends: trendsForAnalysis,
    derived: {
      revenueGrowthPct,
      expenseGrowthPct,
      profitMarginChangePct,
      runwayMonths: bundle.runway.runwayMonths,
      netRunwayMonths,
      trailingNetCashFlow,
      ownerCompensation,
      taxExpense: extras?.taxExpense ?? null,
      grossMarginPct: grossMarginPct != null ? Math.round(grossMarginPct * 10) / 10 : null,
      operatingLeverageRatio: operatingLeverageRatio != null ? Math.round(operatingLeverageRatio * 100) / 100 : null,
      expenseToRevenueRatio: expenseToRevenueRatio != null ? Math.round(expenseToRevenueRatio * 10) / 10 : null,
      revenueLineItems,
      previousRevenueLineItems,
      recurringRevenueChangePct,
      debtToEbitda: balanceSheet?.debtToEbitda ?? null,
      debtServiceCoverage,
      incrementalMarginPct,
      dataError: summary.data_error ?? false,
      excludedPartialMonth: bundle.excludedPartialMonth,
    },
    balanceSheet,
    balanceSheetContext,
  };
}
