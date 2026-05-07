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
  /** Formula components for 30-day window (spec transparency) */
  components: {
    expectedInflowsWeighted: number;
    expectedOutflowsBills: number;
    estimatedRecurringMonthly: number;
    collectionRate: number;
  };
  horizonDays: 30 | 60 | 90;
  /** Ending cash at horizon (expected) */
  endingCashExpected: number;
  series: ForecastDayPoint[];
};

export type ScenarioKind = 'new_hire' | 'revenue_drop' | 'major_purchase';
