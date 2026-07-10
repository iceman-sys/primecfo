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
    /** Primary source for estimatedRecurringMonthly. */
    recurringBasis: 'cash_flow_statement' | 'pnl_net_income_fallback';
    collectionRate: number;
    arApWindowDays: number;
    balanceSheetCash: number | null;
    bankVsStatementDelta: number | null;
    /** Trailing avg net cash increase from Cash Flow Statement when available. */
    avgMonthlyOperatingCashNet: number | null;
    /** Open AR/AP are shown for context but not added to the projection (Option A). */
    includesOpenArApInProjection: boolean;
    /** How many reconciled full months fed the percentile bands. */
    scenarioSampleCount?: number;
    scenarioUsedDefaults?: boolean;
    scenarioBestMonthlyNet?: number;
    scenarioWorstMonthlyNet?: number;
    avgMonthlyOwnerDraws?: number;
    scenarioMethodology?: string;
    /** @deprecated Replaced by percentile net-cash bands. */
    scenarioVolatilityPct?: number | null;
    scenarioOptimisticMultiplier?: number;
    scenarioConservativeMultiplier?: number;
  };
  horizonDays: 30 | 60 | 90;
  /** Ending cash at horizon (expected) */
  endingCashExpected: number;
  series: ForecastDayPoint[];
  /** Same projection with owner draws added back (toggle: before draws). */
  seriesBeforeDraws?: ForecastDayPoint[];
  /** When worst-case path goes negative — show callout instead of deep negative chart line. */
  worstCaseShortfall?: { amount: number; dayOffset: number } | null;
};

export type ScenarioKind = 'new_hire' | 'revenue_drop' | 'major_purchase';
