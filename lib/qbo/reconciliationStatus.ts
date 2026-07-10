import { fetchLastReconciledDate } from '@/lib/qbo/reconciliation';
import { capReconciliationDate } from '@/lib/metrics/partialMonth';
import { daysBetween, formatAdvisoryDate } from '@/lib/dataQuality/utils';

export type ReconciliationSeverity = 'blue' | 'amber' | 'red' | 'unknown';

export type ReconciliationStatus = {
  lastReconciledDate: string | null;
  daysBehind: number | null;
  severity: ReconciliationSeverity;
  headline: string;
  message: string;
  /** Weeks behind (for State C copy); null when unknown. */
  weeksBehind: number | null;
};

function severityForGap(daysBehind: number | null): ReconciliationSeverity {
  if (daysBehind == null) return 'unknown';
  if (daysBehind < 30) return 'blue';
  if (daysBehind < 60) return 'amber';
  return 'red';
}

/**
 * Always-on reconciliation coaching banner (States A–D).
 * Never leads with fetch failure — coaching + service funnel only.
 */
export async function loadReconciliationStatus(
  clientId: string,
  today = new Date()
): Promise<ReconciliationStatus> {
  const raw = await fetchLastReconciledDate(clientId);
  const lastReconciled = capReconciliationDate(raw, today);

  if (!lastReconciled) {
    return {
      lastReconciledDate: null,
      daysBehind: null,
      weeksBehind: null,
      severity: 'unknown',
      headline: 'Pro tip',
      message:
        'PrimeCFO.ai is most effective when QuickBooks is fully reconciled. Recent activity looks lighter than usual, which usually means books are awaiting reconciliation — insights will sharpen as soon as they\u2019re current. Prime Accounting Solutions, LLC can review and reconcile your books.',
    };
  }

  const daysBehind = daysBetween(lastReconciled, today);
  const severity = severityForGap(daysBehind);
  const through = formatAdvisoryDate(lastReconciled);
  const weeksBehind = Math.max(1, Math.round(daysBehind / 7));

  if (severity === 'blue') {
    return {
      lastReconciledDate: lastReconciled.toISOString().slice(0, 10),
      daysBehind,
      weeksBehind,
      severity,
      headline: 'Books current',
      message: `Books reconciled through ${through}. Your insights reflect current data.`,
    };
  }

  if (severity === 'amber') {
    return {
      lastReconciledDate: lastReconciled.toISOString().slice(0, 10),
      daysBehind,
      weeksBehind,
      severity,
      headline: 'Sharpen your insights',
      message:
        `Your books are reconciled through ${through}. PrimeCFO.ai is most effective when QuickBooks is fully reconciled — bringing the last few weeks current will sharpen your forecasts and trends. Prime Accounting Solutions, LLC can handle it for you.`,
    };
  }

  return {
    lastReconciledDate: lastReconciled.toISOString().slice(0, 10),
    daysBehind,
    weeksBehind,
    severity,
    headline: 'Your insights are running on older data',
    message:
      `Books are reconciled through ${through}. Trends and forecasts below may not reflect the last ${weeksBehind} weeks of activity. Reconcile in QuickBooks, or let Prime Accounting Solutions, LLC bring you current.`,
  };
}
