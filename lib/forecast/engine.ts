import type { TierCapabilities } from '@/lib/tiers';
import { deriveMetricsFromBalanceSheet } from '@/lib/deriveMetrics';
import { parseEntityBalance } from '@/lib/qbo/qbParseMoney';
import type { ForecastInputs } from './inputs';
import type { CashFlowForecastResult, ForecastDayPoint } from './types';

const DEFAULT_COLLECTION_RATE = 0.85;

function lastOrAvg(arr: number[], avg: number): number {
  if (arr.length === 0) return avg;
  return arr[arr.length - 1] ?? avg;
}

/**
 * PrimeCFO technical spec: 30d = bank + weighted inflows − bills due − recurring estimate;
 * 60/90 extend with P&L trailing growth on revenue minus average expenses; Act tier with a parsed
 * Cash Flow statement uses average monthly net operating cash plus incremental revenue vs prior month.
 */
export function computeCashForecast(
  inputs: ForecastInputs,
  caps: TierCapabilities
): CashFlowForecastResult {
  const g = inputs.monthlyGrowthRate;
  const collectionRate = DEFAULT_COLLECTION_RATE;

  const expectedInflowsWeighted = inputs.openInvoices.reduce(
    (s, inv) => s + parseEntityBalance(inv) * collectionRate,
    0
  );
  const expectedOutflowsBills = inputs.openBills.reduce((s, b) => s + parseEntityBalance(b), 0);
  /** Recurring operating outflows approximated by trailing average monthly expense (spec: historical patterns). */
  const estimatedRecurringMonthly = Math.max(0, inputs.avgMonthlyExpense);

  let balanceSheetCash: number | null = null;
  let bankVsStatementDelta: number | null = null;
  if (caps.includeBalanceSheetCf && inputs.balanceSheetSnapshot) {
    const entries = deriveMetricsFromBalanceSheet(inputs.balanceSheetSnapshot);
    const cashEntry = entries.find((e) => e.metric_key === 'cash');
    if (cashEntry && typeof cashEntry.value === 'number') {
      balanceSheetCash = cashEntry.value;
      bankVsStatementDelta = inputs.bankBalance - balanceSheetCash;
    }
  }

  const cash30 =
    inputs.bankBalance +
    expectedInflowsWeighted -
    expectedOutflowsBills -
    estimatedRecurringMonthly;

  const lastRev = lastOrAvg(inputs.revenues, inputs.avgMonthlyRevenue);
  const avgExp = inputs.avgMonthlyExpense;
  const useActOperatingCash =
    caps.includeBalanceSheetCf && inputs.avgMonthlyOperatingCashNet != null;
  const oc = inputs.avgMonthlyOperatingCashNet ?? 0;
  const projRev2 = lastRev * (1 + g);

  const series: ForecastDayPoint[] = [{ dayOffset: 0, expected: inputs.bankBalance }];

  const pushPoint = (offset: number, expected: number, og?: number, con?: number) => {
    series.push({
      dayOffset: offset,
      expected,
      ...(og != null ? { optimistic: og } : {}),
      ...(con != null ? { conservative: con } : {}),
    });
  };

  pushPoint(30, cash30);

  let ending = cash30;
  const horizon = caps.forecastDays;

  if (horizon >= 60) {
    const end60 = useActOperatingCash
      ? cash30 + oc + (projRev2 - lastRev)
      : cash30 + projRev2 - avgExp;
    pushPoint(60, end60);
    ending = end60;
  }

  if (horizon >= 90) {
    const rev3 = inputs.avgMonthlyRevenue * (1 + g);
    const rev3Opt = inputs.avgMonthlyRevenue * (1 + g * 1.5);
    const rev3Con = inputs.avgMonthlyRevenue * (1 + g * 0.5);
    const end90 = ending + (useActOperatingCash ? oc + (rev3 - projRev2) : rev3 - avgExp);
    const end90Opt =
      ending + (useActOperatingCash ? oc + (rev3Opt - projRev2) : rev3Opt - avgExp);
    const end90Con =
      ending + (useActOperatingCash ? oc + (rev3Con - projRev2) : rev3Con - avgExp);
    pushPoint(90, end90, end90Opt, end90Con);
    ending = end90;
  }

  return {
    asOf: inputs.asOf,
    tier: caps.tier,
    bankBalance: inputs.bankBalance,
    components: {
      expectedInflowsWeighted,
      expectedOutflowsBills,
      estimatedRecurringMonthly,
      collectionRate,
      arApWindowDays: inputs.arApWindowDays,
      balanceSheetCash,
      bankVsStatementDelta,
      avgMonthlyOperatingCashNet: inputs.avgMonthlyOperatingCashNet,
    },
    horizonDays: horizon,
    endingCashExpected: series[series.length - 1]?.expected ?? cash30,
    series,
  };
}
