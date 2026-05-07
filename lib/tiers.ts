/**
 * Product tiers from pricing-plans.ts (See / Understand / Act).
 * Stripe `plan_id` values: self-service | starter | growth
 */

export type ProductTier = 'see' | 'understand' | 'act';

export type TierCapabilities = {
  tier: ProductTier;
  /** Max cash forecast horizon in days */
  forecastDays: 30 | 60 | 90;
  scenarios: boolean;
  customAlerts: boolean;
  /** Profit & loss history window for seasonality (months) */
  pnlHistoryMonths: 6 | 12;
  includeBalanceSheetCf: boolean;
};

const PLAN_TO_TIER: Record<string, ProductTier> = {
  'self-service': 'see',
  starter: 'understand',
  growth: 'act',
};

export function planIdToTier(planId: string | null | undefined): ProductTier | null {
  if (!planId) return null;
  return PLAN_TO_TIER[planId] ?? null;
}

/** Default tier when subscription is missing (minimal feature set). */
export const DEFAULT_PRODUCT_TIER: ProductTier = 'see';

export function getTierCapabilities(planId: string | null | undefined): TierCapabilities {
  const tier = planIdToTier(planId) ?? DEFAULT_PRODUCT_TIER;
  switch (tier) {
    case 'see':
      return {
        tier,
        forecastDays: 30,
        scenarios: false,
        customAlerts: false,
        pnlHistoryMonths: 6,
        includeBalanceSheetCf: false,
      };
    case 'understand':
      return {
        tier,
        forecastDays: 60,
        scenarios: false,
        customAlerts: false,
        pnlHistoryMonths: 6,
        includeBalanceSheetCf: false,
      };
    case 'act':
      return {
        tier: 'act',
        forecastDays: 90,
        scenarios: true,
        customAlerts: true,
        pnlHistoryMonths: 12,
        includeBalanceSheetCf: true,
      };
  }
}

export function clampForecastHorizon(
  requested: number,
  cap: TierCapabilities['forecastDays']
): 30 | 60 | 90 {
  if (requested <= 30) return 30;
  if (requested <= 60) return Math.min(60, cap) as 30 | 60 | 90;
  return Math.min(90, cap) as 30 | 60 | 90;
}
