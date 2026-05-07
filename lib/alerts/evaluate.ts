import { parseEntityBalance } from '@/lib/qbo/qbParseMoney';
import { arOver30Ratio } from '@/lib/reporting/parseArAging';
import type { ForecastInputs } from '@/lib/forecast/inputs';
import type { CashFlowForecastResult } from '@/lib/forecast/types';

export type AlertKind =
  | 'cash_balance'
  | 'cash_crunch'
  | 'ar_spike'
  | 'revenue_trend'
  | 'expense_anomaly'
  | 'margin_erode';

export type EvaluatedAlert = {
  alert_kind: AlertKind;
  severity_key: string;
  title: string;
  body: string;
};

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

/**
 * Alert priority order matches technical spec §4.2.
 */
export function evaluateFinancialAlerts(
  inputs: ForecastInputs,
  forecast: CashFlowForecastResult,
  options?: {
    cashThreshold?: number;
    crunchThreshold?: number;
    arOverdueRatio?: number;
    revenueDropPct?: number;
    expenseSpikePct?: number;
  }
): EvaluatedAlert[] {
  const avgExp = inputs.avgMonthlyExpense;
  const bank = inputs.bankBalance;
  const cashThreshold = options?.cashThreshold ?? Math.max(avgExp * 2, 1000);
  const crunchThreshold = options?.crunchThreshold ?? Math.max(avgExp * 1, 500);
  const arRatioLimit = options?.arOverdueRatio ?? 0.25;
  const revDrop = (options?.revenueDropPct ?? 15) / 100;
  const expSpike = (options?.expenseSpikePct ?? 30) / 100;

  const out: EvaluatedAlert[] = [];

  // 1 — Cash balance
  if (bank < cashThreshold) {
    const burn = avgExp > 0 ? avgExp / 30 : 0;
    const runwayDays = burn > 0 ? Math.floor(bank / burn) : 0;
    out.push({
      alert_kind: 'cash_balance',
      severity_key: `bal:${Math.floor(bank)}:${Math.floor(cashThreshold)}`,
      title: 'Cash below threshold',
      body: `Your cash balance is ${fmt(bank)}, which is below your ${fmt(
        cashThreshold
      )} guideline. At current burn rate, you have about ${runwayDays} days of runway.`,
    });
  }

  // 6 — Upcoming cash crunch (30d forecast path)
  const min30 = forecast.series.filter((p) => p.dayOffset <= 30).map((p) => p.expected);
  const trough = min30.length ? Math.min(...min30) : bank;
  if (trough < crunchThreshold) {
    const worstDay = forecast.series.find((p) => p.dayOffset <= 30 && p.expected === trough);
    out.push({
      alert_kind: 'cash_crunch',
      severity_key: `crunch:${Math.floor(trough)}`,
      title: 'Projected cash crunch',
      body: `Based on upcoming bills and expected collections, cash is projected to dip to ${fmt(
        trough
      )}${worstDay ? ` around day ${worstDay.dayOffset}` : ''}. Open invoices due within 30 days total ${fmt(
        inputs.invoices30.reduce((s, i) => s + parseEntityBalance(i), 0)
      )} — prioritizing collections may help.`,
    });
  }

  // 2 — AR spike (31+ as proxy using over-30 ratio)
  const arR = arOver30Ratio(inputs.arBuckets);
  if (inputs.arBuckets.total > 0 && arR > arRatioLimit) {
    out.push({
      alert_kind: 'ar_spike',
      severity_key: `ar:${arR.toFixed(2)}`,
      title: 'Overdue receivables elevated',
      body: `About ${(arR * 100).toFixed(0)}% of receivables are past 30 days (vs ${(
        arRatioLimit * 100
      ).toFixed(0)}% guideline). Total AR is ${fmt(inputs.arBuckets.total)}.`,
    });
  }

  // 3 — Revenue trend (use last month vs trailing 3-mo average)
  const revs = inputs.revenues;
  if (revs.length >= 4) {
    const last = revs[revs.length - 1] ?? 0;
    const prev3 = revs.slice(-4, -1);
    const avg3 = prev3.reduce((a, b) => a + b, 0) / prev3.length;
    if (avg3 > 0 && last < avg3 * (1 - revDrop)) {
      const pct = Math.round((1 - last / avg3) * 100);
      out.push({
        alert_kind: 'revenue_trend',
        severity_key: `rev:${pct}`,
        title: 'Revenue trailing below recent average',
        body: `Latest month revenue is ${fmt(last)}, about ${pct}% below your trailing 3-month average of ${fmt(
          avg3
        )}.`,
      });
    }
  }

  // 4 — Expense anomaly (total expense vs trailing 3)
  const exps = inputs.expenses;
  if (exps.length >= 4) {
    const lastE = exps[exps.length - 1] ?? 0;
    const prev3e = exps.slice(-4, -1);
    const avg3e = prev3e.reduce((a, b) => a + b, 0) / prev3e.length;
    if (avg3e > 0 && lastE > avg3e * (1 + expSpike)) {
      const pct = Math.round(((lastE - avg3e) / avg3e) * 100);
      out.push({
        alert_kind: 'expense_anomaly',
        severity_key: `exp:${pct}`,
        title: 'Expenses elevated',
        body: `Operating expenses are ${fmt(lastE)}, about ${pct}% above your trailing 3-month average of ${fmt(
          avg3e
        )}.`,
      });
    }
  }

  // 5 — Margin erosion (net margin last month vs 6-mo average)
  const nets = inputs.netIncomes;
  const revs2 = inputs.revenues;
  if (nets.length >= 2 && revs2.length >= 2) {
    const margins = nets.map((n, i) => {
      const r = revs2[i] ?? 0;
      return r !== 0 ? (n / Math.abs(r)) * 100 : 0;
    });
    const lastM = margins[margins.length - 1] ?? 0;
    const avg6 = margins.reduce((a, b) => a + b, 0) / margins.length;
    if (avg6 - lastM >= 5) {
      out.push({
        alert_kind: 'margin_erode',
        severity_key: `margin:${lastM.toFixed(1)}`,
        title: 'Profit margin compression',
        body: `Net margin is about ${lastM.toFixed(
          1
        )}%, down from your recent average near ${avg6.toFixed(1)}%.`,
      });
    }
  }

  const order: AlertKind[] = [
    'cash_balance',
    'cash_crunch',
    'ar_spike',
    'revenue_trend',
    'expense_anomaly',
    'margin_erode',
  ];
  const rank = (k: AlertKind) => order.indexOf(k);
  return out.sort((a, b) => rank(a.alert_kind) - rank(b.alert_kind));
}
