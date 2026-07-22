import type { TrendPoint } from '@/lib/metrics/runway';

/** Cap reconciliation date so it never reads as later than today (books can't be ahead of calendar). */
export function capReconciliationDate(lastReconciled: Date | null, today = new Date()): Date | null {
  if (!lastReconciled) return null;
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  return lastReconciled > endOfToday ? endOfToday : lastReconciled;
}

/** True when the period ends on or before the last reconciled date (complete month). */
export function isPeriodComplete(endDate: string | undefined, lastReconciled: Date | null): boolean {
  if (!endDate || !lastReconciled) return true;
  const end = new Date(`${endDate.slice(0, 10)}T23:59:59`);
  if (Number.isNaN(end.getTime())) return true;
  const reconEnd = new Date(
    lastReconciled.getFullYear(),
    lastReconciled.getMonth(),
    lastReconciled.getDate(),
    23,
    59,
    59,
    999
  );
  return end <= reconEnd;
}

/** Drop unreconciled / partial trailing periods from trend series used in growth math. */
export function filterCompleteTrends<T extends Pick<TrendPoint, 'end_date'>>(
  trends: T[],
  lastReconciled: Date | null
): T[] {
  if (!lastReconciled || trends.length === 0) return trends;
  const complete = trends.filter((t) => isPeriodComplete(t.end_date, lastReconciled));
  return complete.length >= 2 ? complete : trends.slice(0, -1);
}

/** Split window into current (complete only) and prior period lists for period-over-period totals. */
export function splitPeriodsExcludingPartial<P extends { end_date: string }>(
  windowPeriods: P[],
  priorPeriods: P[],
  lastReconciled: Date | null
): { current: P[]; previous: P[]; excludedPartial: boolean } {
  if (!lastReconciled || windowPeriods.length === 0) {
    return { current: windowPeriods, previous: priorPeriods, excludedPartial: false };
  }

  const last = windowPeriods[windowPeriods.length - 1];
  if (!last || isPeriodComplete(last.end_date, lastReconciled)) {
    return { current: windowPeriods, previous: priorPeriods, excludedPartial: false };
  }

  const trimmedCurrent = windowPeriods.slice(0, -1);
  const trimmedPrevious =
    priorPeriods.length > 0
      ? priorPeriods
      : windowPeriods.length >= 2
        ? windowPeriods.slice(0, -1)
        : priorPeriods;

  return {
    current: trimmedCurrent,
    previous: trimmedPrevious,
    excludedPartial: true,
  };
}

const SPARSE_FLOOR = 100;

/**
 * Drop a trailing month that looks empty vs history (unreconciled / unsynced books),
 * even when QBO has no last-reconciled date. Prevents $0-current vs real-prior cascades.
 */
export function excludeSparseTrailingPeriod<P extends { id: string }>(
  windowPeriods: P[],
  priorPeriods: P[],
  activityByPeriodId: Map<string, number>
): { current: P[]; previous: P[]; excludedSparse: boolean } {
  if (windowPeriods.length < 2) {
    return { current: windowPeriods, previous: priorPeriods, excludedSparse: false };
  }

  const last = windowPeriods[windowPeriods.length - 1];
  const priorInWindow = windowPeriods.slice(0, -1);
  const lastActivity = activityByPeriodId.get(last.id) ?? 0;
  const priorActivities = priorInWindow
    .map((p) => activityByPeriodId.get(p.id) ?? 0)
    .filter((a) => a >= SPARSE_FLOOR);

  if (priorActivities.length === 0) {
    return { current: windowPeriods, previous: priorPeriods, excludedSparse: false };
  }

  const medianPrior =
    [...priorActivities].sort((a, b) => a - b)[Math.floor(priorActivities.length / 2)] ?? 0;

  const trailingLooksEmpty =
    lastActivity < SPARSE_FLOOR ||
    (medianPrior >= SPARSE_FLOOR && lastActivity < medianPrior * 0.25);

  if (!trailingLooksEmpty) {
    return { current: windowPeriods, previous: priorPeriods, excludedSparse: false };
  }

  return {
    current: priorInWindow,
    previous: priorPeriods.length > 0 ? priorPeriods : priorInWindow,
    excludedSparse: true,
  };
}
