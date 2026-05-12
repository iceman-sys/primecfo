import type { ProductTier } from '@/lib/tiers';

export type ForecastDayPoint = {
  dayOffset: number;
  /** Primary projection (expected case) */
  expected: number;
  optimistic?: number;
  conservative?: number;
};

export type CashFlowForecastResult = {
  asOf: string;
  tier: ProductTier;
  bankBalance: number;
  /** Formula components (spec transparency) */
  components: {
    expectedInflowsWeighted: number;
    expectedOutflowsBills: number;
    estimatedRecurringMonthly: number;
    collectionRate: number;
    /** Open AR/AP due-date window end = asOf + this many days (tier horizon). */
    arApWindowDays: number;
    /** Act tier: cash subtotal from Balance Sheet report vs sum of Bank accounts from QBO query. */
    balanceSheetCash: number | null;
    bankVsStatementDelta: number | null;
    /** Act tier: avg monthly net operating cash from Cash Flow report when parsed. */
    avgMonthlyOperatingCashNet: number | null;
  };
  horizonDays: 30 | 60 | 90;
  /** Ending cash at horizon (expected) */
  endingCashExpected: number;
  series: ForecastDayPoint[];
};

export type ScenarioKind = 'new_hire' | 'revenue_drop' | 'major_purchase';
