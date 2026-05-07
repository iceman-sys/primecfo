import type { CashFlowForecastResult, ScenarioKind } from '@/lib/forecast/types';

export type NewHireParams = {
  annualSalary: number;
  startDate: string; // YYYY-MM-DD
  oneTimeOnboarding: number;
};

export type RevenueDropParams = { pct: 10 | 20 | 30 };

export type MajorPurchaseParams = {
  amount: number;
  date: string;
  monthlyPayment?: number;
};

function pointDate(asOfYmd: string, dayOffset: number): Date {
  const d = new Date(asOfYmd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d;
}

function applyNewHire(
  base: CashFlowForecastResult,
  p: NewHireParams,
  asOfYmd: string
): CashFlowForecastResult {
  const monthly = p.annualSalary / 12;
  const start = new Date(p.startDate + 'T12:00:00Z');
  const series = base.series.map((pt) => {
    let e = pt.expected;
    const t = pointDate(asOfYmd, pt.dayOffset);
    if (t >= start) {
      const months =
        (t.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (t.getUTCMonth() - start.getUTCMonth());
      e -= monthly * Math.max(1, months + 1);
    }
    if (
      t.getUTCFullYear() === start.getUTCFullYear() &&
      t.getUTCMonth() === start.getUTCMonth()
    ) {
      e -= p.oneTimeOnboarding;
    }
    return { ...pt, expected: e };
  });
  return {
    ...base,
    series,
    endingCashExpected: series[series.length - 1]?.expected ?? base.endingCashExpected,
  };
}

function applyRevenueDrop(base: CashFlowForecastResult, pct: number): CashFlowForecastResult {
  const b0 = base.series[0]?.expected ?? 0;
  const factor = 1 - pct / 100;
  const series = base.series.map((pt) => ({
    ...pt,
    expected: b0 + (pt.expected - b0) * factor,
    optimistic: pt.optimistic != null ? b0 + (pt.optimistic - b0) * factor : undefined,
    conservative: pt.conservative != null ? b0 + (pt.conservative - b0) * factor : undefined,
  }));
  return {
    ...base,
    series,
    endingCashExpected: series[series.length - 1]?.expected ?? base.endingCashExpected,
  };
}

function applyMajorPurchase(
  base: CashFlowForecastResult,
  p: MajorPurchaseParams,
  asOfYmd: string
): CashFlowForecastResult {
  const purchase = new Date(p.date + 'T12:00:00Z');
  const series = base.series.map((pt) => {
    let e = pt.expected;
    const t = pointDate(asOfYmd, pt.dayOffset);
    if (p.monthlyPayment && p.monthlyPayment > 0) {
      if (t >= purchase) {
        const months =
          (t.getUTCFullYear() - purchase.getUTCFullYear()) * 12 +
          (t.getUTCMonth() - purchase.getUTCMonth());
        e -= p.monthlyPayment * Math.max(0, months + 1);
      }
    } else if (t >= purchase) {
      e -= p.amount;
    }
    return { ...pt, expected: e };
  });
  return {
    ...base,
    series,
    endingCashExpected: series[series.length - 1]?.expected ?? base.endingCashExpected,
  };
}

export function applyScenario(
  base: CashFlowForecastResult,
  kind: ScenarioKind,
  params: NewHireParams | RevenueDropParams | MajorPurchaseParams,
  asOfYmd: string
): CashFlowForecastResult {
  if (kind === 'new_hire') return applyNewHire(base, params as NewHireParams, asOfYmd);
  if (kind === 'revenue_drop')
    return applyRevenueDrop(base, (params as RevenueDropParams).pct);
  return applyMajorPurchase(base, params as MajorPurchaseParams, asOfYmd);
}
