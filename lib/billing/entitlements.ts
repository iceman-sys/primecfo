import { planIdToTier, type ProductTier } from '@/lib/tiers';
import { CLIENT_LIMITS } from '@/lib/billing/clientLimits';

export type AiSummaryCadence = 'monthly' | 'weekly';
export type AdvisoryMeeting = 'none' | 'quarterly' | 'monthly';

export type PlanEntitlements = {
  tier: ProductTier;
  /** See = 30d, Understand = 60d, Act = 90d; Starter = 0 (runway only) */
  forecastHorizonDays: 0 | 30 | 60 | 90;
  aiSummaryCadence: AiSummaryCadence;
  customAlerts: boolean;
  forecastScenarios: boolean;
  advisoryMeeting: AdvisoryMeeting;
  /** Max active client companies on this plan */
  maxActiveClients: number;
};

const ENTITLEMENTS: Record<ProductTier, PlanEntitlements> = {
  starter: {
    tier: 'starter',
    forecastHorizonDays: 0,
    aiSummaryCadence: 'monthly',
    customAlerts: false,
    forecastScenarios: false,
    advisoryMeeting: 'none',
    maxActiveClients: CLIENT_LIMITS.starter,
  },
  see: {
    tier: 'see',
    forecastHorizonDays: 30,
    aiSummaryCadence: 'monthly',
    customAlerts: false,
    forecastScenarios: false,
    advisoryMeeting: 'none',
    maxActiveClients: CLIENT_LIMITS.see,
  },
  understand: {
    tier: 'understand',
    forecastHorizonDays: 60,
    aiSummaryCadence: 'weekly',
    customAlerts: false,
    forecastScenarios: false,
    advisoryMeeting: 'quarterly',
    maxActiveClients: CLIENT_LIMITS.understand,
  },
  act: {
    tier: 'act',
    forecastHorizonDays: 90,
    aiSummaryCadence: 'weekly',
    customAlerts: true,
    forecastScenarios: true,
    advisoryMeeting: 'monthly',
    maxActiveClients: CLIENT_LIMITS.act,
  },
};

/** Feature matrix for a Stripe plan_id (self-service | starter | growth). */
export function getPlanEntitlements(planId: string | null | undefined): PlanEntitlements {
  const tier = planIdToTier(planId) ?? 'starter';
  return ENTITLEMENTS[tier];
}
