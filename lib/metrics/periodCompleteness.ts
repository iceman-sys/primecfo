import { MATERIALITY_FLOOR_USD } from '@/lib/metrics/displayRules';

/** Near-zero for P&L totals — below materiality, treat as empty books. */
export function isNearZeroAmount(n: number, floor = MATERIALITY_FLOOR_USD): boolean {
  return !Number.isFinite(n) || Math.abs(n) < floor;
}

/**
 * True when the current reporting window looks incomplete / unreconciled:
 * near-zero revenue (or activity) against a material prior period, or an
 * explicitly excluded trailing partial month with a steep revenue collapse.
 */
export function isCurrentPeriodIncomplete(opts: {
  currentRevenue: number;
  priorRevenue: number;
  excludedPartialMonth?: boolean;
  /** Current trailing month activity (rev+exp). */
  currentActivity?: number;
  /** Median of prior months' activity. */
  trailingMedianActivity?: number;
}): boolean {
  const {
    currentRevenue,
    priorRevenue,
    excludedPartialMonth = false,
    currentActivity,
    trailingMedianActivity,
  } = opts;

  const priorMaterial = !isNearZeroAmount(priorRevenue);
  const currentEmpty = isNearZeroAmount(currentRevenue);

  // Classic cascade: prior period had real revenue, current reads ~$0.
  if (priorMaterial && currentEmpty) return true;

  // Steep collapse vs material prior (<5% of prior remaining).
  if (
    priorMaterial &&
    Math.abs(currentRevenue) < Math.abs(priorRevenue) * 0.05
  ) {
    return true;
  }

  // Activity volume drop (same signal as stale-books coaching).
  if (
    trailingMedianActivity != null &&
    trailingMedianActivity > MATERIALITY_FLOOR_USD &&
    currentActivity != null &&
    currentActivity < trailingMedianActivity * 0.5 &&
    priorMaterial &&
    Math.abs(currentRevenue) < Math.abs(priorRevenue) * 0.5
  ) {
    return true;
  }

  // Partial month already trimmed but PoP still shows a steep false decline.
  if (excludedPartialMonth && priorMaterial && currentEmpty) return true;

  return false;
}

/** Dashboard / analytics metric ids suppressed when the period is incomplete. */
export const REVENUE_DEPENDENT_METRIC_IDS = [
  'revenueTrend',
  'profitMargin',
  'netMargin',
  'grossMargin',
  'currentRatio',
  'quickRatio',
  'seasonalRevenue',
  'riskPosture',
] as const;

export type RevenueDependentMetricId = (typeof REVENUE_DEPENDENT_METRIC_IDS)[number];

export function shouldSuppressMetric(
  metricId: RevenueDependentMetricId | string,
  currentPeriodIncomplete: boolean
): boolean {
  if (!currentPeriodIncomplete) return false;
  return (REVENUE_DEPENDENT_METRIC_IDS as readonly string[]).includes(metricId);
}

export const PENDING_RECONCILIATION_LABEL = 'Pending reconciliation';
export const PENDING_RECONCILIATION_CONTEXT =
  'Sync your books to see this metric — current period looks incomplete';
