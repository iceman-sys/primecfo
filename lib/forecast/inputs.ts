import type { TierCapabilities } from '@/lib/tiers';
import {
  fetchOpenBillsDueBy,
  fetchOpenInvoicesDueBy,
  sumBankAccountBalances,
  type QboMoneyEntity,
} from '@/lib/qbo/queryRunner';
import { fetchProfitLossByMonth, fetchArAgingSummary } from '@/lib/qbo/forecastReports';
import { monthlyGrowthRateFromSix, parseMonthlyPnLSeries } from '@/lib/reporting/parseMonthlyPnL';
import { parseArAgingBuckets } from '@/lib/reporting/parseArAging';
import { fetchReportFromQuickBooks } from '@/lib/qbo/reports';

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
  invoices30: QboMoneyEntity[];
  bills30: QboMoneyEntity[];
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
};

export async function loadForecastInputs(
  clientId: string,
  caps: TierCapabilities
): Promise<ForecastInputs> {
  const today = new Date();
  const asOf = ymd(today);
  const horizon30 = ymd(addDays(today, 30));

  const months = caps.pnlHistoryMonths;
  const startAnchor = new Date(today);
  startAnchor.setMonth(startAnchor.getMonth() - months);
  startAnchor.setDate(1);
  const startStr = ymd(startAnchor);

  const [bankBalance, invoices30, bills30, pnlResolved, arRaw] = await Promise.all([
    sumBankAccountBalances(clientId),
    fetchOpenInvoicesDueBy(clientId, horizon30),
    fetchOpenBillsDueBy(clientId, horizon30),
    fetchProfitLossByMonth(clientId, startStr, asOf, 'Cash').catch(() =>
      fetchProfitLossByMonth(clientId, startStr, asOf, 'Accrual')
    ),
    fetchArAgingSummary(clientId, asOf, 'Accrual').catch(() => null),
  ]);

  const parsed = parseMonthlyPnLSeries(pnlResolved);
  const growth = monthlyGrowthRateFromSix(parsed.revenues.slice(-6));
  const n = parsed.revenues.length || 1;
  const avgRev = parsed.revenues.reduce((a, b) => a + b, 0) / n;
  const avgExp = parsed.expenses.reduce((a, b) => a + b, 0) / n;

  let balanceSheetSnapshot: unknown | null = null;
  let cashFlow12m: unknown | null = null;
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
  }

  return {
    asOf,
    bankBalance,
    invoices30,
    bills30,
    monthlyLabels: parsed.monthLabels,
    revenues: parsed.revenues,
    expenses: parsed.expenses,
    netIncomes: parsed.netIncomes,
    monthlyGrowthRate: Number.isFinite(growth) ? growth : 0,
    avgMonthlyRevenue: avgRev,
    avgMonthlyExpense: avgExp,
    arBuckets: arRaw ? parseArAgingBuckets(arRaw) : parseArAgingBuckets({}),
    balanceSheetSnapshot,
    cashFlow12m,
  };
}
