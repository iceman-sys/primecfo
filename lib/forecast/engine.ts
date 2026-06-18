import type { TierCapabilities } from '@/lib/tiers';
import { deriveMetricsFromBalanceSheet } from '@/lib/deriveMetrics';
import { parseEntityBalance } from '@/lib/qbo/qbParseMoney';
import type { ForecastInputs } from './inputs';
import type { CashFlowForecastResult, ForecastDayPoint } from './types';

export type ScenarioParams = {
  collectionRate: number;
  expenseMultiplier: number;
};

export const SCENARIO_EXPECTED: ScenarioParams = {
  collectionRate: 0.85,
  expenseMultiplier: 1.0,
};

export const SCENARIO_OPTIMISTIC: ScenarioParams = {
  collectionRate: 0.95,
  expenseMultiplier: 0.95,
};

export const SCENARIO_CONSERVATIVE: ScenarioParams = {
  collectionRate: 0.65,
  expenseMultiplier: 1.1,
};

function bucketDueAmount(
  entities: ForecastInputs['openInvoices'],
  asOfYmd: string,
  minDays: number,
  maxDays: number
): number {
  const asOf = new Date(`${asOfYmd}T12:00:00`);
  let sum = 0;
  for (const entity of entities) {
    const dueStr = entity.DueDate;
    const due = dueStr ? new Date(`${dueStr}T12:00:00`) : asOf;
    const daysUntil = Math.ceil((due.getTime() - asOf.getTime()) / 86_400_000);
    if (daysUntil <= maxDays && (minDays <= 0 || daysUntil > minDays)) {
      sum += parseEntityBalance(entity);
    }
  }
  return sum;
}

function projectBalance(
  inputs: ForecastInputs,
  params: ScenarioParams,
  horizonDays: 30 | 60 | 90
): { day30: number; day60: number; day90: number } {
  const avgRev = inputs.avgMonthlyRevenue;
  const avgExp = inputs.avgMonthlyExpense * params.expenseMultiplier;
  let recurringMonthlyNet = avgRev - avgExp;

  if (Math.abs(recurringMonthlyNet) < 1 && inputs.netIncomes.length > 0) {
    const n = inputs.netIncomes.length;
    const avgNet = inputs.netIncomes.reduce((a, b) => a + b, 0) / n;
    recurringMonthlyNet = avgNet * (2 - params.expenseMultiplier);
  }

  const asOf = inputs.asOf;
  const ar0_30 = bucketDueAmount(inputs.openInvoices, asOf, -9999, 30);
  const ar31_60 = bucketDueAmount(inputs.openInvoices, asOf, 30, 60);
  const ar61_90 = bucketDueAmount(inputs.openInvoices, asOf, 60, 90);

  const ap0_30 = bucketDueAmount(inputs.openBills, asOf, -9999, 30);
  const ap31_60 = bucketDueAmount(inputs.openBills, asOf, 30, 60);
  const ap61_90 = bucketDueAmount(inputs.openBills, asOf, 60, 90);

  const netArApMonth1 = ar0_30 * params.collectionRate - ap0_30;
  const netArApMonth2 = ar31_60 * params.collectionRate - ap31_60;
  const netArApMonth3 = ar61_90 * params.collectionRate - ap61_90;

  const day30 = inputs.bankBalance + recurringMonthlyNet + netArApMonth1;
  const day60 = day30 + recurringMonthlyNet + netArApMonth2;
  const day90 = day60 + recurringMonthlyNet + netArApMonth3;

  return {
    day30,
    day60: horizonDays >= 60 ? day60 : day30,
    day90: horizonDays >= 90 ? day90 : horizonDays >= 60 ? day60 : day30,
  };
}

/**
 * Cash forecast: month-by-month recurring net from trailing P&L, AR/AP bucketed by due window.
 */
export function computeCashForecast(
  inputs: ForecastInputs,
  caps: TierCapabilities
): CashFlowForecastResult {
  const horizon = caps.forecastDays;

  const expected = projectBalance(inputs, SCENARIO_EXPECTED, horizon);
  const optimistic = projectBalance(inputs, SCENARIO_OPTIMISTIC, horizon);
  const conservative = projectBalance(inputs, SCENARIO_CONSERVATIVE, horizon);

  const weightedInflowsExpected = inputs.openInvoices.reduce(
    (s, inv) => s + parseEntityBalance(inv) * SCENARIO_EXPECTED.collectionRate,
    0
  );
  const outflowsBills = inputs.openBills.reduce((s, b) => s + parseEntityBalance(b), 0);
  const recurringMonthlyNet = inputs.avgMonthlyRevenue - inputs.avgMonthlyExpense;

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

  const series: ForecastDayPoint[] = [{ dayOffset: 0, expected: inputs.bankBalance }];

  const push = (offset: 30 | 60 | 90, exp: number, opt: number, con: number) => {
    series.push({
      dayOffset: offset,
      expected: exp,
      optimistic: caps.scenarios ? opt : undefined,
      conservative: caps.scenarios ? con : undefined,
    });
  };

  push(30, expected.day30, optimistic.day30, conservative.day30);
  if (horizon >= 60) {
    push(60, expected.day60, optimistic.day60, conservative.day60);
  }
  if (horizon >= 90) {
    push(90, expected.day90, optimistic.day90, conservative.day90);
  }

  const last = series[series.length - 1];

  return {
    asOf: inputs.asOf,
    tier: caps.tier,
    bankBalance: inputs.bankBalance,
    components: {
      expectedInflowsWeighted: weightedInflowsExpected,
      expectedOutflowsBills: outflowsBills,
      estimatedRecurringMonthly: recurringMonthlyNet,
      collectionRate: SCENARIO_EXPECTED.collectionRate,
      arApWindowDays: inputs.arApWindowDays,
      balanceSheetCash,
      bankVsStatementDelta,
      avgMonthlyOperatingCashNet: inputs.avgMonthlyOperatingCashNet,
    },
    horizonDays: horizon,
    endingCashExpected: last?.expected ?? expected.day30,
    series,
  };
}
