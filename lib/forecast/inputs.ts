import type { TierCapabilities } from '@/lib/tiers';
import {
  fetchOpenBillsDueBy,
  fetchOpenInvoicesDueBy,
  sumBankAccountBalances,
  type QboMoneyEntity,
} from '@/lib/qbo/queryRunner';
import { fetchProfitLossByMonth, fetchArAgingSummary } from '@/lib/qbo/forecastReports';
import { monthlyGrowthRateFromSix, parseMonthlyPnLSeries, trailingMonthlyAverages } from '@/lib/reporting/parseMonthlyPnL';
import { parseArAgingBuckets } from '@/lib/reporting/parseArAging';
import { fetchReportFromQuickBooks } from '@/lib/qbo/reports';
import { averageMonthlyOperatingNetCash } from '@/lib/forecast/parseCashFlowForForecast';

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export type ForecastInputs = {
  asOf: string;
  bankBalance: number;
  /** Open invoices with Balance > 0 and DueDate on or before horizon end (includes past due). */
  openInvoices: QboMoneyEntity[];
  openBills: QboMoneyEntity[];
  /** Upper bound (days from asOf) for open AR/AP QBO queries; equals tier forecast horizon. */
  arApWindowDays: number;
  monthlyLabels: string[];
  revenues: number[];
  expenses: number[];
  netIncomes: number[];
  monthlyGrowthRate: number;
  avgMonthlyRevenue: number;
  avgMonthlyExpense: number;
  arBuckets: ReturnType<typeof parseArAgingBuckets>;
  /** Act tier: Balance sheet + cash-flow JSON when available */
  balanceSheetSnapshot: unknown | null;
  cashFlow12m: unknown | null;
  /** Act tier: parsed from cashFlow12m when possible */
  avgMonthlyOperatingCashNet: number | null;
};

export async function loadForecastInputs(
  clientId: string,
  caps: TierCapabilities
): Promise<ForecastInputs> {
  const today = new Date();
  const asOf = ymd(today);
  const arApWindowDays = caps.forecastDays;
  const horizonEnd = ymd(addDays(today, arApWindowDays));

  const months = caps.pnlHistoryMonths;
  const startAnchor = new Date(today);
  startAnchor.setMonth(startAnchor.getMonth() - months);
  startAnchor.setDate(1);
  const startStr = ymd(startAnchor);

  const [bankBalance, openInvoices, openBills, pnlAccrual, pnlCash, arRaw] = await Promise.all([
    sumBankAccountBalances(clientId),
    fetchOpenInvoicesDueBy(clientId, horizonEnd),
    fetchOpenBillsDueBy(clientId, horizonEnd),
    fetchProfitLossByMonth(clientId, startStr, asOf, 'Accrual').catch(() => null),
    fetchProfitLossByMonth(clientId, startStr, asOf, 'Cash').catch(() => null),
    fetchArAgingSummary(clientId, asOf, 'Accrual').catch(() => null),
  ]);

  const pnlResolved = pnlAccrual ?? pnlCash;
  const parsed = parseMonthlyPnLSeries(pnlResolved);
  const parsedFallback =
    parsed.revenues.every((v) => v === 0) && parsed.expenses.every((v) => v === 0) && pnlCash
      ? parseMonthlyPnLSeries(pnlCash)
      : parsed;

  const series =
    parsedFallback.revenues.some((v) => v > 0) || parsedFallback.expenses.some((v) => v > 0)
      ? parsedFallback
      : parsed;

  const growth = monthlyGrowthRateFromSix(series.revenues.slice(-6));
  const { avgRevenue: avgRev, avgExpense: avgExp } = trailingMonthlyAverages(series);

  let balanceSheetSnapshot: unknown | null = null;
  let cashFlow12m: unknown | null = null;
  let avgMonthlyOperatingCashNet: number | null = null;
  if (caps.includeBalanceSheetCf) {
    const startCf = addDays(today, 0);
    startCf.setMonth(startCf.getMonth() - 12);
    const startCfStr = ymd(startCf);
    const [bs, cf] = await Promise.all([
      fetchReportFromQuickBooks(clientId, 'balance_sheet', startStr, asOf, 'Accrual').catch(() => null),
      fetchReportFromQuickBooks(clientId, 'cash_flow', startCfStr, asOf, 'Cash').catch(() => null),
    ]);
    balanceSheetSnapshot = bs;
    cashFlow12m = cf;
    if (cf) avgMonthlyOperatingCashNet = averageMonthlyOperatingNetCash(cf);
  }

  return {
    asOf,
    bankBalance,
    openInvoices,
    openBills,
    arApWindowDays,
    monthlyLabels: series.monthLabels,
    revenues: series.revenues,
    expenses: series.expenses,
    netIncomes: series.netIncomes.length ? series.netIncomes : series.revenues.map((r, i) => r - (series.expenses[i] ?? 0)),
    monthlyGrowthRate: Number.isFinite(growth) ? growth : 0,
    avgMonthlyRevenue: avgRev,
    avgMonthlyExpense: avgExp,
    arBuckets: arRaw ? parseArAgingBuckets(arRaw) : parseArAgingBuckets({}),
    balanceSheetSnapshot,
    cashFlow12m,
    avgMonthlyOperatingCashNet,
  };
}
