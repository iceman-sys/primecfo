import type { TierCapabilities } from '@/lib/tiers';

import {

  fetchOpenBillsDueBy,

  fetchOpenInvoicesDueBy,

  sumBankAccountBalances,

  type QboMoneyEntity,

} from '@/lib/qbo/queryRunner';

import {

  fetchProfitLossByMonth,

  fetchCashFlowByMonth,

  fetchArAgingSummary,

} from '@/lib/qbo/forecastReports';

import { monthlyGrowthRateFromSix, parseMonthlyPnLSeries, trailingMonthlyAverages } from '@/lib/reporting/parseMonthlyPnL';

import { parseArAgingBuckets } from '@/lib/reporting/parseArAging';

import { fetchReportFromQuickBooks } from '@/lib/qbo/reports';

import { loadIntegratedReportRaw, loadLatestReportRaw } from '@/lib/metrics/loadIntegratedReport';

import { getMonthlyNetCashFromReport } from '@/lib/metrics/monthlyNetCash';

import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';



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

  openInvoices: QboMoneyEntity[];

  openBills: QboMoneyEntity[];

  arApWindowDays: number;

  monthlyLabels: string[];

  revenues: number[];

  expenses: number[];

  netIncomes: number[];

  monthlyGrowthRate: number;

  avgMonthlyRevenue: number;

  avgMonthlyExpense: number;

  avgMonthlyNetIncome: number;

  arBuckets: ReturnType<typeof parseArAgingBuckets>;

  balanceSheetSnapshot: unknown | null;

  cashFlowMonthly: unknown | null;

  /** Trailing avg monthly net cash increase from Cash Flow Statement (preferred). */

  avgMonthlyNetCashIncrease: number | null;

};



async function loadSyncedMonthlyCashFlow(clientId: string, monthsBack: number): Promise<unknown | null> {

  const sb = supabaseAdmin();

  const cutoff = new Date();

  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const { data } = await sb

    .from('financial_reports')

    .select('raw_json, period_label')

    .eq('client_id', clientId)

    .eq('report_type', 'cash_flow')

    .gte('synced_at', cutoff.toISOString())

    .order('synced_at', { ascending: false })

    .limit(5);



  if (!data?.length) return null;

  const multiCol = data.find((r) => {

    const json = r.raw_json as { Columns?: { Column?: unknown[] } };

    return (json.Columns?.Column?.length ?? 0) > 2;

  });

  return multiCol?.raw_json ?? data[0]?.raw_json ?? null;

}



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



  const [bankBalance, openInvoices, openBills, pnlAccrual, pnlCash, arRaw, cashFlowLive] =

    await Promise.all([

      sumBankAccountBalances(clientId),

      fetchOpenInvoicesDueBy(clientId, horizonEnd),

      fetchOpenBillsDueBy(clientId, horizonEnd),

      fetchProfitLossByMonth(clientId, startStr, asOf, 'Accrual').catch(() => null),

      fetchProfitLossByMonth(clientId, startStr, asOf, 'Cash').catch(() => null),

      fetchArAgingSummary(clientId, asOf, 'Accrual').catch(() => null),

      fetchCashFlowByMonth(clientId, startStr, asOf, 'Cash').catch(() => null),

    ]);



  let cashFlowMonthly = cashFlowLive;
  if (!cashFlowMonthly) {
    cashFlowMonthly = await loadSyncedMonthlyCashFlow(clientId, months);
  }

  // Prefer integrated synced CF (same source as breakeven insight / insights pipeline).
  const integratedCf =
    (await loadIntegratedReportRaw(clientId, '3m', 'cash_flow')) ??
    (await loadLatestReportRaw(clientId, 'cash_flow'));
  const cfForMonthlyNet = integratedCf ?? cashFlowMonthly;

  const avgMonthlyNetCashIncrease = cfForMonthlyNet
    ? getMonthlyNetCashFromReport(cfForMonthlyNet, 3)
    : null;



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

  const { avgRevenue: avgRev, avgExpense: avgExp, avgNetIncome } = trailingMonthlyAverages(series);



  let balanceSheetSnapshot: unknown | null = null;

  if (caps.includeBalanceSheetCf) {

    balanceSheetSnapshot = await fetchReportFromQuickBooks(

      clientId,

      'balance_sheet',

      startStr,

      asOf,

      'Accrual'

    ).catch(() => null);

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

    netIncomes: series.netIncomes.length

      ? series.netIncomes

      : series.revenues.map((r, i) => r - (series.expenses[i] ?? 0)),

    monthlyGrowthRate: Number.isFinite(growth) ? growth : 0,

    avgMonthlyRevenue: avgRev,

    avgMonthlyExpense: avgExp,

    avgMonthlyNetIncome: avgNetIncome,

    arBuckets: arRaw ? parseArAgingBuckets(arRaw) : parseArAgingBuckets({}),

    balanceSheetSnapshot,

    cashFlowMonthly,

    avgMonthlyNetCashIncrease,

  };

}

