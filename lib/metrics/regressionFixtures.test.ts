/**
 * Regression fixtures — Prime Accounting Solutions (Last 12 Months).
 * Source: connected QuickBooks statements per Andrew Compton spec (June 24, 2026).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  annualizeEbitda,
  computeDebtToEbitda,
  computePeriodEbitda,
} from '@/lib/metrics/ebitda';
import { getMonthlyNetCashFromReport } from '@/lib/metrics/monthlyNetCash';
import { computeCashForecast } from '@/lib/forecast/engine';
import type { ForecastInputs } from '@/lib/forecast/inputs';
import type { TierCapabilities } from '@/lib/tiers';
import { computeAnalyticsKpis } from '@/lib/metrics/ratios';
import type { SummaryMetrics } from '@/lib/metrics/loadClientMetrics';

export const PRIME_ACCOUNTING_FIXTURE = {
  totalIncome: 1_093_291,
  grossProfit: 521_665,
  netOperatingIncome: 247_054,
  netIncome: 250_744,
  interestExpense: 60_207,
  depreciation: 0,
  incomeTaxExpense: 3_202,
  netChangeInCash: -10_959,
  periodMonths: 12,
  totalDebt: 871_782,
  longTermDebt: 795_000,
  currentAssets: 337_009,
  currentLiabilities: 176_905,
  cash: 36_904,
  accountsReceivable: 11_073,
  retainedEarnings: -68_640,
  operatingExpenses: 274_611,
} as const;

const summaryFixture: SummaryMetrics = {
  revenue: PRIME_ACCOUNTING_FIXTURE.totalIncome,
  expenses: PRIME_ACCOUNTING_FIXTURE.operatingExpenses,
  total_costs: PRIME_ACCOUNTING_FIXTURE.totalIncome - PRIME_ACCOUNTING_FIXTURE.grossProfit,
  net_income: PRIME_ACCOUNTING_FIXTURE.netIncome,
  profit_margin_pct: 22.9,
  cash: PRIME_ACCOUNTING_FIXTURE.cash,
  accounts_receivable: PRIME_ACCOUNTING_FIXTURE.accountsReceivable,
  accounts_payable: 0,
  cogs: PRIME_ACCOUNTING_FIXTURE.totalIncome - PRIME_ACCOUNTING_FIXTURE.grossProfit,
  gross_profit: PRIME_ACCOUNTING_FIXTURE.grossProfit,
  current_assets: PRIME_ACCOUNTING_FIXTURE.currentAssets,
  current_liabilities: PRIME_ACCOUNTING_FIXTURE.currentLiabilities,
  inventory: 0,
  quick_assets: PRIME_ACCOUNTING_FIXTURE.cash + PRIME_ACCOUNTING_FIXTURE.accountsReceivable,
  data_error: false,
};

const forecastCaps = {
  tier: 'act',
  forecastDays: 90,
  scenarios: true,
  pnlHistoryMonths: 12,
  includeBalanceSheetCf: false,
  customAlerts: true,
} as TierCapabilities;

describe('Prime Accounting regression fixtures', () => {
  it('computes EBITDA from NOI + interest + D&A (not net income)', () => {
    const periodEbitda = computePeriodEbitda({
      netOperatingIncome: PRIME_ACCOUNTING_FIXTURE.netOperatingIncome,
      interestExpense: PRIME_ACCOUNTING_FIXTURE.interestExpense,
      depreciationAmortization: PRIME_ACCOUNTING_FIXTURE.depreciation,
    });
    assert.ok(periodEbitda != null);
    assert.ok(Math.abs(periodEbitda - 307_261) < 1, `expected 307,261 EBITDA, got ${periodEbitda}`);

    const wrongEbitda = PRIME_ACCOUNTING_FIXTURE.netIncome + PRIME_ACCOUNTING_FIXTURE.interestExpense;
    assert.notEqual(periodEbitda, wrongEbitda);
  });

  it('debt-to-EBITDA ≈ 2.84x (not 3.48x from net income)', () => {
    const periodEbitda = computePeriodEbitda({
      netOperatingIncome: PRIME_ACCOUNTING_FIXTURE.netOperatingIncome,
      interestExpense: PRIME_ACCOUNTING_FIXTURE.interestExpense,
      depreciationAmortization: PRIME_ACCOUNTING_FIXTURE.depreciation,
    });
    assert.ok(periodEbitda != null);
    const annualized = annualizeEbitda(periodEbitda, PRIME_ACCOUNTING_FIXTURE.periodMonths);
    assert.ok(annualized != null);
    const ratio = computeDebtToEbitda(PRIME_ACCOUNTING_FIXTURE.totalDebt, annualized);
    assert.ok(ratio != null);
    assert.ok(Math.abs(ratio - 2.84) < 0.1, `expected ~2.84x, got ${ratio}`);
    assert.ok(Math.abs(ratio - 3.48) > 0.3, 'must not use net-income EBITDA (~3.48x)');
  });

  it('monthly net cash flow is negative (~-$913/mo for 12-mo total)', () => {
    const cfRaw = {
      Rows: {
        Row: [
          {
            ColData: [{ value: 'Net cash increase for period' }, { value: '-10959' }],
          },
        ],
      },
    };
    const monthly = getMonthlyNetCashFromReport(cfRaw, 12);
    assert.ok(monthly != null);
    assert.ok(monthly < 0, 'monthly net cash must be negative');
    assert.ok(Math.abs(monthly - -913.25) < 5, `expected ~-913/mo, got ${monthly}`);
  });

  it('gross margin ≈ 47.7%', () => {
    const kpis = computeAnalyticsKpis(summaryFixture, [], null, '12m');
    assert.ok(kpis.grossMargin != null);
    assert.ok(Math.abs(kpis.grossMargin - 47.7) < 0.2);
  });

  it('expense-to-revenue ≈ 25.1%', () => {
    const ratio =
      (PRIME_ACCOUNTING_FIXTURE.operatingExpenses / PRIME_ACCOUNTING_FIXTURE.totalIncome) * 100;
    assert.ok(Math.abs(ratio - 25.1) < 0.2);
  });

  it('current ratio = 1.91', () => {
    const kpis = computeAnalyticsKpis(summaryFixture, [], null, '12m');
    assert.equal(kpis.currentRatio, 1.91);
  });

  it('quick ratio uses cash + AR over current liabilities', () => {
    const kpis = computeAnalyticsKpis(summaryFixture, [], null, '12m');
    const expected =
      Math.round(
        ((PRIME_ACCOUNTING_FIXTURE.cash + PRIME_ACCOUNTING_FIXTURE.accountsReceivable) /
          PRIME_ACCOUNTING_FIXTURE.currentLiabilities) *
          100
      ) / 100;
    assert.equal(kpis.quickRatio, expected);
    assert.ok(kpis.quickRatio != null && kpis.quickRatio >= 0.26 && kpis.quickRatio <= 0.28);
  });

  it('90-day cash outlook is flat to declining with negative monthly net', () => {
    const inputs = {
      asOf: '2026-06-24',
      bankBalance: 29_250,
      openInvoices: [],
      openBills: [],
      arApWindowDays: 90,
      monthlyLabels: [],
      revenues: [],
      expenses: [],
      netIncomes: [],
      monthlyGrowthRate: 0,
      avgMonthlyRevenue: 90_000,
      avgMonthlyExpense: 18_000,
      avgMonthlyNetIncome: 72_000,
      arBuckets: { total: 0, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days91_plus: 0 },
      balanceSheetSnapshot: null,
      cashFlowMonthly: null,
      avgMonthlyNetCashIncrease: -913.25,
    } as ForecastInputs;

    const forecast = computeCashForecast(inputs, forecastCaps);
    const day90 = forecast.series.find((p) => p.dayOffset === 90)?.expected;
    assert.ok(day90 != null);
    assert.ok(day90 < 35_000, `day-90 should be ~flat/down, got ${day90}`);
    assert.ok(day90 > 20_000);
    assert.ok(forecast.components.estimatedRecurringMonthly < 0);
  });
});
