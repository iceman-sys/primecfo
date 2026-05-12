import type { ChartDataPoint } from "@/lib/financialData";

/**
 * Lightweight 14-day cash trail (~linear) bridging prior trend month to today's bank balance
 * so the dashboard chart satisfies the Cash Flow Forecast spec's “history left of Today” cue.
 */
export function buildHistoricCashTrail14d(
  trends: ChartDataPoint[],
  bankToday: number
): Array<{ offset: number; cash: number }> {
  if (!Number.isFinite(bankToday)) bankToday = 0;
  if (!trends.length)
    return Array.from({ length: 15 }, (_, i) => ({ offset: i - 14, cash: bankToday }));
  const last = trends[trends.length - 1]!;
  const prev = trends.length >= 2 ? trends[trends.length - 2]!.cash : last.cash;
  return Array.from({ length: 15 }, (_, i) => {
    const offset = i - 14;
    const t = (offset + 14) / 14;
    const cash = prev * (1 - t) + bankToday * t;
    return { offset, cash };
  });
}
