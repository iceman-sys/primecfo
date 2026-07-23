/**
 * Format a reconciled reporting window for the dashboard, e.g.
 * "Showing Mar–May 2026 · reconciled"
 */
export function formatReconciledWindowLabel(
  periods: Array<{ start_date: string; end_date: string }>
): string {
  if (periods.length === 0) return '';

  const first = periods[0];
  const last = periods[periods.length - 1];
  const start = new Date(`${first.start_date.slice(0, 10)}T12:00:00`);
  const end = new Date(`${last.end_date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endYear = end.getFullYear();
  const startYear = start.getFullYear();

  if (startMonth === endMonth && startYear === endYear) {
    return `Showing ${startMonth} ${endYear} · reconciled`;
  }

  if (startYear === endYear) {
    return `Showing ${startMonth}–${endMonth} ${endYear} · reconciled`;
  }

  return `Showing ${startMonth} ${startYear}–${endMonth} ${endYear} · reconciled`;
}

/**
 * Prefer the last N fully reconciled periods when the calendar window still
 * includes months after lastReconciled (dynamic cutoff / period anchoring).
 */
export function selectReconciledWindow<P extends { end_date: string }>(
  allPeriods: P[],
  calendarWindow: P[],
  periodCount: number,
  lastReconciled: Date | null,
  isComplete: (endDate: string, recon: Date) => boolean
): { window: P[]; anchored: boolean } {
  if (!lastReconciled || allPeriods.length === 0) {
    return { window: calendarWindow, anchored: false };
  }

  const calendarHasIncomplete = calendarWindow.some(
    (p) => !isComplete(p.end_date, lastReconciled)
  );
  if (!calendarHasIncomplete) {
    return { window: calendarWindow, anchored: false };
  }

  const complete = allPeriods.filter((p) => isComplete(p.end_date, lastReconciled));
  if (complete.length === 0) {
    return { window: calendarWindow, anchored: false };
  }

  const anchored = complete.slice(-periodCount);
  if (anchored.length === 0) {
    return { window: calendarWindow, anchored: false };
  }

  return { window: anchored, anchored: true };
}
