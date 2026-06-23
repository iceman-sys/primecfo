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
  suppress?: boolean;
};

export function hasPriorRevenueComparison(totalRevenuePrevious: number, previousItems: RevenueLineItem[]): boolean {
  return totalRevenuePrevious > 0 || previousItems.length > 0;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/** Single-period fallback: concentration + recurring vs one-time mix (no prior period required). */
export function evaluateRevenueComposition(input: {
  currentItems: RevenueLineItem[];
  totalRevenueCurrent: number;
}): RevenueTrendEvaluation | null {
  const { currentItems, totalRevenueCurrent } = input;
  if (totalRevenueCurrent <= 0 || currentItems.length === 0) return null;

  const recurring = sumRevenueByKind(currentItems, 'recurring');
  const oneTime = sumRevenueByKind(currentItems, 'one_time');
  const recurringPct = (recurring / totalRevenueCurrent) * 100;
  const oneTimePct = (oneTime / totalRevenueCurrent) * 100;

  const sorted = [...currentItems].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const top = sorted[0];
  const topPct = top ? (Math.abs(top.amount) / Math.abs(totalRevenueCurrent)) * 100 : 0;

  const parts: string[] = [];
  if (recurring > 0 || oneTime > 0) {
    parts.push(
      `Recurring services are ~${recurringPct.toFixed(0)}% of revenue` +
        (oneTime > 0 ? `; seasonal/one-time work is ~${oneTimePct.toFixed(0)}%.` : '.')
    );
  }
  if (top && topPct >= 15) {
    parts.push(
      `Your largest revenue source (${top.label}) is ${topPct.toFixed(0)}% of total revenue` +
        (topPct >= 40 ? ' — high concentration warrants diversification.' : '.')
    );
  }

  if (parts.length === 0) return null;

  const severity: RevenueTrendEvaluation['severity'] =
    topPct >= 40 ? 'watch' : recurringPct >= 50 ? 'positive' : 'info';

  return {
    severity,
    title: topPct >= 40 ? 'Revenue Concentration' : 'Revenue Composition',
    message: parts.join(' '),
    metricValue: topPct >= 15 ? `${topPct.toFixed(0)}% top line` : `${recurringPct.toFixed(0)}% recurring`,
    recurringChangePct: null,
    totalChangePct: null,
  };
}

/**
 * Trend when prior period exists; composition fallback when it does not.
 * Never returns N/A — returns null only when no revenue data at all.
 */
export function evaluateRevenueInsight(input: {
  currentItems: RevenueLineItem[];
  previousItems: RevenueLineItem[];
  totalRevenueCurrent: number;
  totalRevenuePrevious: number;
}): RevenueTrendEvaluation | null {
  if (!hasPriorRevenueComparison(input.totalRevenuePrevious, input.previousItems)) {
    return evaluateRevenueComposition({
      currentItems: input.currentItems,
      totalRevenueCurrent: input.totalRevenueCurrent,
    });
  }

  const trend = evaluateRevenueTrend(input);
  if (trend.title === 'Revenue Overview' && trend.metricValue === 'N/A') {
    return (
      evaluateRevenueComposition({
        currentItems: input.currentItems,
        totalRevenueCurrent: input.totalRevenueCurrent,
      }) ?? { ...trend, suppress: true }
    );
  }
  return trend;
}

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

  const fmtPctVal = (n: number | null) => (n == null ? 'N/A' : fmtPct(n));

  if (recurringChange != null && recurringChange <= -10) {
    return {
      severity: 'warning',
      title: 'Recurring Revenue Decline',
      message: `Your recurring revenue base declined ${Math.abs(recurringChange).toFixed(
        1
      )}% period-over-period. This is the stable core of the business and warrants attention — distinguish from seasonal or one-time work.`,
      metricValue: fmtPctVal(recurringChange),
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
      metricValue: fmtPctVal(totalChange),
      recurringChangePct: recurringChange,
      totalChangePct: totalChange,
    };
  }

  if (recurringChange != null && recurringChange > 0) {
    return {
      severity: 'positive',
      title: 'Stable Recurring Revenue',
      message: `Your recurring revenue base is healthy and grew ${recurringChange.toFixed(1)}% period-over-period.`,
      metricValue: fmtPctVal(recurringChange),
      recurringChangePct: recurringChange,
      totalChangePct: totalChange,
    };
  }

  if (totalChange != null) {
    return {
      severity: totalChange >= 0 ? 'positive' : 'info',
      title: totalChange >= 0 ? 'Revenue Growth' : 'Revenue Change',
      message: `Total revenue changed ${totalChange >= 0 ? 'up' : 'down'} ${Math.abs(totalChange).toFixed(1)}% period-over-period. Review recurring vs. seasonal income accounts for context.`,
      metricValue: fmtPctVal(totalChange),
      recurringChangePct: recurringChange,
      totalChangePct: totalChange,
    };
  }

  return {
    severity: 'info',
    title: 'Revenue Overview',
    message: 'Insufficient prior-period revenue detail to assess trend.',
    metricValue: 'N/A',
    recurringChangePct: recurringChange,
    totalChangePct: totalChange,
    suppress: true,
  };
}
