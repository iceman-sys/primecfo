import type { TierCapabilities } from '@/lib/tiers';
import { deriveMetricsFromBalanceSheet } from '@/lib/deriveMetrics';
import { parseEntityBalance } from '@/lib/qbo/qbParseMoney';
import type { ForecastInputs } from './inputs';
import type { CashFlowForecastResult, ForecastDayPoint } from './types';

export type ScenarioParams = {
  /** Multiplier on trailing monthly net cash (conservative < 1 < optimistic). */
  netMultiplier: number;
};

export const SCENARIO_EXPECTED: ScenarioParams = {
  netMultiplier: 1.0,
};

export const SCENARIO_OPTIMISTIC: ScenarioParams = {
  netMultiplier: 1.15,
};

export const SCENARIO_CONSERVATIVE: ScenarioParams = {
  netMultiplier: 0.75,
};

function resolveRecurringMonthlyNet(inputs: ForecastInputs): {
  value: number;
  basis: 'cash_flow_statement' | 'pnl_net_income_fallback';
} {
  if (
    inputs.avgMonthlyNetCashIncrease != null &&
    Number.isFinite(inputs.avgMonthlyNetCashIncrease)
  ) {
    return { value: inputs.avgMonthlyNetCashIncrease, basis: 'cash_flow_statement' };
  }

  if (inputs.avgMonthlyNetIncome != null && Number.isFinite(inputs.avgMonthlyNetIncome)) {
    return { value: inputs.avgMonthlyNetIncome, basis: 'pnl_net_income_fallback' };
  }

  const nets = inputs.netIncomes.filter((n) => Number.isFinite(n));
  if (nets.length > 0) {
    const trailing = nets.slice(-3);
    const avg = trailing.reduce((a, b) => a + b, 0) / trailing.length;
    return { value: avg, basis: 'pnl_net_income_fallback' };
  }

  return {
    value: inputs.avgMonthlyRevenue - inputs.avgMonthlyExpense,
    basis: 'pnl_net_income_fallback',
  };
}

/**
 * Option A: compound trailing net cash from the Cash Flow Statement each month.
 * Open AR/AP are NOT added separately (already captured in CF operating/financing activity).
 */
function projectBalance(
  inputs: ForecastInputs,
  params: ScenarioParams,
  horizonDays: 30 | 60 | 90
): { day30: number; day60: number; day90: number } {
  const { value: baseNet } = resolveRecurringMonthlyNet(inputs);
  const recurringMonthlyNet = baseNet * params.netMultiplier;

  const day30 = inputs.bankBalance + recurringMonthlyNet;
  const day60 = day30 + recurringMonthlyNet;
  const day90 = day60 + recurringMonthlyNet;

  return {
    day30,
    day60: horizonDays >= 60 ? day60 : day30,
    day90: horizonDays >= 90 ? day90 : horizonDays >= 60 ? day60 : day30,
  };
}

/**
 * Cash forecast: month-by-month compounding of trailing net cash increase from QBO Cash Flow.
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
    (s, inv) => s + parseEntityBalance(inv) * 0.85,
    0
  );
  const outflowsBills = inputs.openBills.reduce((s, b) => s + parseEntityBalance(b), 0);

  const recurring = resolveRecurringMonthlyNet(inputs);

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
      estimatedRecurringMonthly: recurring.value,
      recurringBasis: recurring.basis,
      collectionRate: 0.85,
      arApWindowDays: inputs.arApWindowDays,
      balanceSheetCash,
      bankVsStatementDelta,
      avgMonthlyOperatingCashNet: inputs.avgMonthlyNetCashIncrease,
      includesOpenArApInProjection: false,
    },
    horizonDays: horizon,
    endingCashExpected: last?.expected ?? expected.day30,
    series,
  };
}
