import { planIdToTier, type ProductTier } from '@/lib/tiers';

export type AiSummaryCadence = 'monthly' | 'weekly';
export type AdvisoryMeeting = 'none' | 'quarterly' | 'monthly';

export type PlanEntitlements = {
  tier: ProductTier;
  /** See = 30d, Understand = 60d, Act = 90d (+ scenarios via tiers.ts) */
  forecastHorizonDays: 30 | 60 | 90;
  aiSummaryCadence: AiSummaryCadence;
  customAlerts: boolean;
  forecastScenarios: boolean;
  advisoryMeeting: AdvisoryMeeting;
};

const ENTITLEMENTS: Record<ProductTier, PlanEntitlements> = {
  see: {
    tier: 'see',
    forecastHorizonDays: 30,
    aiSummaryCadence: 'monthly',
    customAlerts: false,
    forecastScenarios: false,
    advisoryMeeting: 'none',
  },
  understand: {
    tier: 'understand',
    forecastHorizonDays: 60,
    aiSummaryCadence: 'weekly',
    customAlerts: false,
    forecastScenarios: false,
    advisoryMeeting: 'quarterly',
  },
  act: {
    tier: 'act',
    forecastHorizonDays: 90,
    aiSummaryCadence: 'weekly',
    customAlerts: true,
    forecastScenarios: true,
    advisoryMeeting: 'monthly',
  },
};

/** Feature matrix for a Stripe plan_id (self-service | starter | growth). */
export function getPlanEntitlements(planId: string | null | undefined): PlanEntitlements {
  const tier = planIdToTier(planId) ?? 'see';
  return ENTITLEMENTS[tier];
}
