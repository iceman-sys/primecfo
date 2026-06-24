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
import {
  extractInterestExpense,
  extractNetOperatingIncome,
} from '@/lib/ai/extractReportExtras';
import { extractBalanceSheetSnapshot } from '@/lib/ai/extractBalanceSheet';

/** Minimal single-column P&L with the exact account labels QBO returns for this client. */
const PNL_RAW = {
  Columns: { Column: [{ ColTitle: { value: '' } }, { ColTitle: { value: 'Total' } }] },
  Rows: {
    Row: [
      { type: 'Data', ColData: [{ value: 'Interest (other than mortgage)' }, { value: '60207' }] },
      { type: 'Data', ColData: [{ value: 'Net Operating Income' }, { value: '247054' }] },
      { type: 'Data', ColData: [{ value: 'Net Income' }, { value: '250256' }] },
    ],
  },
};

/**
 * Balance sheet whose credit-card detail rows don't contain card keywords (named by bank /
 * card number). Accounts 4943 and 4944 are card sub-accounts inside the Credit Cards section,
 * already included in the "Total Credit Cards" of $122,379 — so they must NOT be added again.
 */
const BS_RAW = {
  Columns: { Column: [{ ColTitle: { value: '' } }, { ColTitle: { value: 'Total' } }] },
  Rows: {
    Row: [
      {
        Header: { ColData: [{ value: 'Credit Cards' }, { value: '' }] },
        Rows: {
          Row: [
            { type: 'Data', ColData: [{ value: 'Chase Ink 4943' }, { value: '22500' }] },
            { type: 'Data', ColData: [{ value: 'Amex 4944' }, { value: '22750' }] },
            { type: 'Data', ColData: [{ value: 'BofA 9001' }, { value: '77129' }] },
          ],
        },
        Summary: { ColData: [{ value: 'Total Credit Cards' }, { value: '122379' }] },
      },
      {
        Header: { ColData: [{ value: 'Long-Term Liabilities' }, { value: '' }] },
        Rows: {
          Row: [
            { type: 'Data', ColData: [{ value: 'SBA EIDL Loan' }, { value: '795000' }] },
          ],
        },
        Summary: { ColData: [{ value: 'Total Long-Term Liabilities' }, { value: '795000' }] },
      },
    ],
  },
};

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

  it('extracts interest expense from "Interest (other than mortgage)"', () => {
    const interest = extractInterestExpense(PNL_RAW);
    assert.equal(interest, 60_207);
  });

  it('extracts Net Operating Income, not Net Income', () => {
    const noi = extractNetOperatingIncome(PNL_RAW);
    assert.equal(noi, 247_054);
    assert.notEqual(noi, 250_256);
  });

  it('end-to-end EBITDA from parsed P&L = $307,261 (NOI + interest)', () => {
    const noi = extractNetOperatingIncome(PNL_RAW);
    const interest = extractInterestExpense(PNL_RAW);
    const ebitda = computePeriodEbitda({
      netOperatingIncome: noi,
      interestExpense: interest,
      depreciationAmortization: 0,
      netIncomeFallback: 250_256,
    });
    assert.equal(ebitda, 307_261);
  });

  it('EBITDA fallback never collapses to bare net income (still adds interest)', () => {
    const ebitda = computePeriodEbitda({
      netOperatingIncome: null,
      interestExpense: 60_207,
      depreciationAmortization: 0,
      incomeTaxExpense: 0,
      netIncomeFallback: 250_256,
    });
    assert.ok(ebitda != null && ebitda > 250_256);
  });

  it('credit-card balance reconciles to the "Total Credit Cards" section ($122,379)', () => {
    const bs = extractBalanceSheetSnapshot(BS_RAW);
    assert.ok(bs != null);
    assert.equal(bs.creditCardBalances, 122_379);
  });

  it('total debt = term debt + credit cards (no double-counting card sub-accounts)', () => {
    const bs = extractBalanceSheetSnapshot(BS_RAW);
    assert.ok(bs != null);
    // 4943/4944 are inside the Credit Cards total, not separate LOC rows.
    assert.equal(bs.lineOfCredit, null);
    assert.equal(bs.totalDebt, 795_000 + 122_379);
  });

  it('debt-to-EBITDA lands at ~3.0x with reconciled debt + correct EBITDA', () => {
    const bs = extractBalanceSheetSnapshot(BS_RAW);
    const ebitda = computePeriodEbitda({
      netOperatingIncome: 247_054,
      interestExpense: 60_207,
      depreciationAmortization: 0,
    });
    const ratio = computeDebtToEbitda(bs?.totalDebt ?? null, ebitda);
    assert.ok(ratio != null);
    assert.ok(Math.abs(ratio - 3.0) < 0.05, `expected ~3.0x, got ${ratio}x`);
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
