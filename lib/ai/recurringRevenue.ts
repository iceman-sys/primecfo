import type { RevenueLineItem } from '@/lib/ai/getFinancialContext';

export type RevenueAccountKind = 'recurring' | 'one_time' | 'unknown';

/** Default patterns — extend per client via config later. */
const RECURRING_PATTERNS = [
  'accounting services',
  'fcfo services',
  'fractional cfo',
  'tax planning',
  'tax planning & advisory',
  'advisory',
  'bookkeeping',
  'monthly retainer',
  'cfo services',
];

const ONE_TIME_PATTERNS = [
  'tax preparation',
  'tax prep',
  'e-file',
  'e file',
  'efile',
  'llc formation',
  'software resale',
  'quickbooks resale',
  'client refund',
  'other sales',
  'formation',
];

function normalize(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyRevenueAccount(label: string): RevenueAccountKind {
  const norm = normalize(label);
  if (RECURRING_PATTERNS.some((p) => norm.includes(p))) return 'recurring';
  if (ONE_TIME_PATTERNS.some((p) => norm.includes(p))) return 'one_time';
  return 'unknown';
}

export function sumRevenueByKind(
  items: RevenueLineItem[],
  kind: RevenueAccountKind
): number {
  return items.reduce((sum, item) => {
    const k = classifyRevenueAccount(item.label);
    if (kind === 'unknown') {
      return k === 'unknown' ? sum + item.amount : sum;
    }
    return k === kind ? sum + item.amount : sum;
  }, 0);
}

export function pctChange(prev: number, curr: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export type RevenueTrendEvaluation = {
  severity: 'critical' | 'warning' | 'watch' | 'positive' | 'info';
  title: string;
  message: string;
  metricValue: string;
  recurringChangePct: number | null;
  totalChangePct: number | null;
};

export function evaluateRevenueTrend(input: {
  currentItems: RevenueLineItem[];
  previousItems: RevenueLineItem[];
  totalRevenueCurrent: number;
  totalRevenuePrevious: number;
}): RevenueTrendEvaluation {
  const recurringNow = sumRevenueByKind(input.currentItems, 'recurring');
  const recurringPrev = sumRevenueByKind(input.previousItems, 'recurring');
  const oneTimeNow = sumRevenueByKind(input.currentItems, 'one_time');
  const oneTimePrev = sumRevenueByKind(input.previousItems, 'one_time');

  const recurringChange = pctChange(recurringPrev, recurringNow);
  const totalChange = pctChange(input.totalRevenuePrevious, input.totalRevenueCurrent);
  const oneTimeChange = pctChange(oneTimePrev, oneTimeNow);

  const fmtPct = (n: number | null) => (n == null ? 'N/A' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);

  if (recurringChange != null && recurringChange <= -10) {
    return {
      severity: 'warning',
      title: 'Recurring Revenue Decline',
      message: `Your recurring revenue base declined ${Math.abs(recurringChange).toFixed(
        1
      )}% period-over-period. This is the stable core of the business and warrants attention — distinguish from seasonal or one-time work.`,
      metricValue: fmtPct(recurringChange),
      recurringChangePct: recurringChange,
      totalChangePct: totalChange,
    };
  }

  if (
    totalChange != null &&
    totalChange < -5 &&
    (recurringChange == null || recurringChange >= -5)
  ) {
    const seasonalNote =
      oneTimeChange != null && oneTimeChange < -10
        ? ' The decline is concentrated in one-time/seasonal items (e.g., tax-season work).'
        : ' The recurring base held steady while total revenue dipped.';
    return {
      severity: 'info',
      title: 'Seasonal Revenue Shift',
      message: `Total revenue is down ${Math.abs(totalChange).toFixed(
        1
      )}% period-over-period, but your recurring base is stable or growing.${seasonalNote} This is expected for many professional services firms and is not a sustainability concern.`,
      metricValue: fmtPct(totalChange),
      recurringChangePct: recurringChange,
      totalChangePct: totalChange,
    };
  }

  if (recurringChange != null && recurringChange > 0) {
    return {
      severity: 'positive',
      title: 'Stable Recurring Revenue',
      message: `Your recurring revenue base is healthy and grew ${recurringChange.toFixed(1)}% period-over-period.`,
      metricValue: fmtPct(recurringChange),
      recurringChangePct: recurringChange,
      totalChangePct: totalChange,
    };
  }

  return {
    severity: 'info',
    title: 'Revenue Overview',
    message:
      totalChange != null
        ? `Total revenue changed ${totalChange >= 0 ? 'up' : 'down'} ${Math.abs(totalChange).toFixed(1)}% period-over-period. Review recurring vs. seasonal income accounts for context.`
        : 'Insufficient prior-period revenue detail to assess trend.',
    metricValue: fmtPct(totalChange),
    recurringChangePct: recurringChange,
    totalChangePct: totalChange,
  };
}
