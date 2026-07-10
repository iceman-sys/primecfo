import type { TierCapabilities } from '@/lib/tiers';
import { deriveMetricsFromBalanceSheet } from '@/lib/deriveMetrics';
import { parseEntityBalance } from '@/lib/qbo/qbParseMoney';
import { assertMonthlyNetCashConsistency } from '@/lib/metrics/monthlyNetCash';
import type { ForecastInputs } from './inputs';
import type { CashFlowForecastResult, ForecastDayPoint } from './types';
import { deriveNetCashScenarioBands, medianOf } from './scenarioBands';

function resolveFallbackMonthlyNet(inputs: ForecastInputs): {
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

function projectBalance(
  bankBalance: number,
  monthlyNet: number,
  horizonDays: 30 | 60 | 90
): { day30: number; day60: number; day90: number } {
  const day30 = bankBalance + monthlyNet;
  const day60 = day30 + monthlyNet;
  const day90 = day60 + monthlyNet;

  return {
    day30,
    day60: horizonDays >= 60 ? day60 : day30,
    day90: horizonDays >= 90 ? day90 : horizonDays >= 60 ? day60 : day30,
  };
}

/**
 * Cash forecast: compound median / percentile monthly net cash from reconciled full months.
 * Owner draws are separated so the UI can toggle "at current draw pace" vs "before draws".
 */
export function computeCashForecast(
  inputs: ForecastInputs,
  caps: TierCapabilities
): CashFlowForecastResult {
  if (caps.forecastDays === 0) {
    throw new Error('Forecast not available on Starter tier.');
  }
  const horizon = caps.forecastDays;

  const fallback = resolveFallbackMonthlyNet(inputs);
  const withDraws = inputs.reconciledMonthlyCash.map((p) => p.netCash);
  const beforeDraws = inputs.reconciledMonthlyCash.map((p) => p.netCash + p.ownerDraws);
  const avgMonthlyDraws =
    inputs.reconciledMonthlyCash.length > 0
      ? medianOf(inputs.reconciledMonthlyCash.map((p) => p.ownerDraws))
      : 0;

  const bandsWithDraws = deriveNetCashScenarioBands(withDraws, fallback.value);
  const bandsBeforeDraws = deriveNetCashScenarioBands(beforeDraws, fallback.value + avgMonthlyDraws);

  const expected = projectBalance(inputs.bankBalance, bandsWithDraws.expectedMonthlyNet, horizon);
  const optimistic = projectBalance(inputs.bankBalance, bandsWithDraws.bestMonthlyNet, horizon);
  const conservative = projectBalance(inputs.bankBalance, bandsWithDraws.worstMonthlyNet, horizon);

  const expectedBeforeDraws = projectBalance(
    inputs.bankBalance,
    bandsBeforeDraws.expectedMonthlyNet,
    horizon
  );
  const optimisticBeforeDraws = projectBalance(
    inputs.bankBalance,
    bandsBeforeDraws.bestMonthlyNet,
    horizon
  );
  const conservativeBeforeDraws = projectBalance(
    inputs.bankBalance,
    bandsBeforeDraws.worstMonthlyNet,
    horizon
  );

  const weightedInflowsExpected = inputs.openInvoices.reduce(
    (s, inv) => s + parseEntityBalance(inv) * 0.85,
    0
  );
  const outflowsBills = inputs.openBills.reduce((s, b) => s + parseEntityBalance(b), 0);

  let referenceAr = weightedInflowsExpected;
  let referenceAp = outflowsBills;

  if (inputs.balanceSheetSnapshot) {
    const bsEntries = deriveMetricsFromBalanceSheet(inputs.balanceSheetSnapshot);
    const arEntry = bsEntries.find((e) => e.metric_key === 'accounts_receivable');
    const apEntry = bsEntries.find((e) => e.metric_key === 'accounts_payable');
    if (arEntry != null) referenceAr = arEntry.value;
    if (apEntry != null) referenceAp = apEntry.value;
  } else if (inputs.balanceSheetArAp) {
    referenceAr = inputs.balanceSheetArAp.ar;
    referenceAp = inputs.balanceSheetArAp.ap;
  }

  assertMonthlyNetCashConsistency(
    'CF statement monthly net',
    fallback.basis === 'cash_flow_statement' ? fallback.value : null,
    'forecast expected monthly step',
    bandsWithDraws.usedDefaults && fallback.basis === 'cash_flow_statement'
      ? bandsWithDraws.expectedMonthlyNet
      : null
  );

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
  const seriesBeforeDraws: ForecastDayPoint[] = [
    { dayOffset: 0, expected: inputs.bankBalance },
  ];

  const push = (
    target: ForecastDayPoint[],
    offset: 30 | 60 | 90,
    exp: number,
    opt: number,
    con: number
  ) => {
    target.push({
      dayOffset: offset,
      expected: exp,
      optimistic: caps.scenarios ? opt : undefined,
      conservative: caps.scenarios ? con : undefined,
    });
  };

  push(series, 30, expected.day30, optimistic.day30, conservative.day30);
  push(
    seriesBeforeDraws,
    30,
    expectedBeforeDraws.day30,
    optimisticBeforeDraws.day30,
    conservativeBeforeDraws.day30
  );
  if (horizon >= 60) {
    push(series, 60, expected.day60, optimistic.day60, conservative.day60);
    push(
      seriesBeforeDraws,
      60,
      expectedBeforeDraws.day60,
      optimisticBeforeDraws.day60,
      conservativeBeforeDraws.day60
    );
  }
  if (horizon >= 90) {
    push(series, 90, expected.day90, optimistic.day90, conservative.day90);
    push(
      seriesBeforeDraws,
      90,
      expectedBeforeDraws.day90,
      optimisticBeforeDraws.day90,
      conservativeBeforeDraws.day90
    );
  }

  const last = series[series.length - 1];

  // Shortfall: first day the raw worst-case path crosses below zero
  let worstCaseShortfall: { amount: number; dayOffset: number } | null = null;
  if (caps.scenarios) {
    const worstPath = [
      { day: 0, cash: inputs.bankBalance },
      { day: 30, cash: conservative.day30 },
      ...(horizon >= 60 ? [{ day: 60, cash: conservative.day60 }] : []),
      ...(horizon >= 90 ? [{ day: 90, cash: conservative.day90 }] : []),
    ];
    for (const pt of worstPath) {
      if (pt.cash < 0) {
        worstCaseShortfall = { amount: Math.abs(pt.cash), dayOffset: pt.day };
        break;
      }
    }
  }

  return {
    asOf: inputs.asOf,
    tier: caps.tier,
    bankBalance: inputs.bankBalance,
    components: {
      expectedInflowsWeighted: referenceAr,
      expectedOutflowsBills: referenceAp,
      estimatedRecurringMonthly: bandsWithDraws.expectedMonthlyNet,
      recurringBasis:
        bandsWithDraws.usedDefaults && fallback.basis === 'pnl_net_income_fallback'
          ? 'pnl_net_income_fallback'
          : 'cash_flow_statement',
      collectionRate: 0.85,
      arApWindowDays: inputs.arApWindowDays,
      balanceSheetCash,
      bankVsStatementDelta,
      avgMonthlyOperatingCashNet: inputs.avgMonthlyNetCashIncrease,
      includesOpenArApInProjection: false,
      scenarioSampleCount: bandsWithDraws.sampleCount,
      scenarioUsedDefaults: bandsWithDraws.usedDefaults,
      scenarioBestMonthlyNet: bandsWithDraws.bestMonthlyNet,
      scenarioWorstMonthlyNet: bandsWithDraws.worstMonthlyNet,
      avgMonthlyOwnerDraws: avgMonthlyDraws,
      scenarioMethodology:
        'Scenarios are based on your last 6 months of actual reconciled cash flow (20th–80th percentile months).',
    },
    horizonDays: horizon,
    endingCashExpected: last?.expected ?? expected.day30,
    series,
    seriesBeforeDraws,
    worstCaseShortfall,
  };
}
