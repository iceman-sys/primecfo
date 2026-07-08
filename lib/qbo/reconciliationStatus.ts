import { fetchLastReconciledDate } from '@/lib/qbo/reconciliation';
import { capReconciliationDate } from '@/lib/metrics/partialMonth';
import { daysBetween, formatAdvisoryDate, formatGapSinceReconciliation } from '@/lib/dataQuality/utils';

export type ReconciliationSeverity = 'blue' | 'amber' | 'red' | 'unknown';

export type ReconciliationStatus = {
  lastReconciledDate: string | null;
  daysBehind: number | null;
  severity: ReconciliationSeverity;
  headline: string;
  message: string;
};

function severityForGap(daysBehind: number | null): ReconciliationSeverity {
  if (daysBehind == null) return 'unknown';
  if (daysBehind < 30) return 'blue';
  if (daysBehind < 60) return 'amber';
  return 'red';
}

/**
 * Build always-on reconciliation banner copy from QBO ReconcileInfo.LastReconciledDate.
 * Never shows a reconciliation date later than today.
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
      severity: 'unknown',
      headline: 'Reconciliation date unavailable',
      message:
        'We could not confirm your last bank reconciliation date from QuickBooks. ' +
        'If your books are more than a month behind, figures and trend insights may not reflect recent activity.',
    };
  }

  const daysBehind = daysBetween(lastReconciled, today);
  const severity = severityForGap(daysBehind);
  const through = formatAdvisoryDate(lastReconciled);
  const gapLabel = formatGapSinceReconciliation(daysBehind);

  if (severity === 'blue') {
    return {
      lastReconciledDate: lastReconciled.toISOString().slice(0, 10),
      daysBehind,
      severity,
      headline: 'Books current',
      message: `Your books were last reconciled through ${through}. Insights use complete, reconciled periods.`,
    };
  }

  if (severity === 'amber') {
    return {
      lastReconciledDate: lastReconciled.toISOString().slice(0, 10),
      daysBehind,
      severity,
      headline: 'Books may be behind',
      message:
        `Your books were last reconciled through ${through} — ${gapLabel}. ` +
        'Recent activity may not be fully captured yet, which can skew trend insights. ' +
        'The latest month is excluded from period-over-period calculations until books are current.',
    };
  }

  return {
    lastReconciledDate: lastReconciled.toISOString().slice(0, 10),
    daysBehind,
    severity,
    headline: 'Books significantly behind',
    message:
      `Your books were last reconciled through ${through} — ${gapLabel}. ` +
      'Figures may be significantly off until books are brought current. ' +
      'Partial months are excluded from trend calculations.',
  };
}
