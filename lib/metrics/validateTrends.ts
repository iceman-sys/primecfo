import type { TrendPoint } from '@/lib/metrics/runway';

export type PeriodTotalsValidation = {
  ok: boolean;
  message: string | null;
  periodCount: number;
  missingPeriods: number;
};

/** Reconcile summed monthly P&L against revenue − total costs ≈ net income. */
export function validatePeriodTotals(trends: TrendPoint[]): PeriodTotalsValidation {
  if (trends.length === 0) {
    return { ok: false, message: 'No synced periods in the selected range.', periodCount: 0, missingPeriods: 0 };
  }

  const missingPeriods = trends.filter((t) => t.revenue === 0 && t.expenses === 0 && t.profit === 0).length;
  const totalRevenue = trends.reduce((s, t) => s + t.revenue, 0);
  const totalCosts = trends.reduce((s, t) => s + t.expenses, 0);
  const totalNet = trends.reduce((s, t) => s + t.profit, 0);
  const impliedNet = totalRevenue - totalCosts;

  if (totalRevenue <= 0) {
    return {
      ok: false,
      message: 'Total revenue is zero — re-sync monthly P&L for this range.',
      periodCount: trends.length,
      missingPeriods,
    };
  }

  const tolerance = Math.max(Math.abs(totalRevenue) * 0.02, 500);
  if (Math.abs(impliedNet - totalNet) > tolerance) {
    return {
      ok: false,
      message: `Period totals may be inconsistent (revenue − costs ≠ net income by ${Math.round(
        Math.abs(impliedNet - totalNet)
      ).toLocaleString()}). Re-sync from Dashboard.`,
      periodCount: trends.length,
      missingPeriods,
    };
  }

  if (missingPeriods > 0) {
    return {
      ok: true,
      message: `${missingPeriods} period(s) have no synced P&L data — totals may understate reality.`,
      periodCount: trends.length,
      missingPeriods,
    };
  }

  return { ok: true, message: null, periodCount: trends.length, missingPeriods: 0 };
}
