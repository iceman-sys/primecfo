/**
 * CPA-grade cash scenario bands from actual reconciled monthly net cash flows.
 * Expected = median; Best/Worst = ~80th / ~20th percentile (2nd-best / 2nd-worst with 6 points).
 */

export type ScenarioNetBands = {
  expectedMonthlyNet: number;
  bestMonthlyNet: number;
  worstMonthlyNet: number;
  sampleCount: number;
  usedDefaults: boolean;
};

export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * With n samples sorted ascending:
 * - worst ≈ 20th percentile → index near floor(0.2*(n-1)); with 6 pts use 2nd-worst (index 1)
 * - best ≈ 80th percentile → with 6 pts use 2nd-best (index n-2)
 */
export function deriveNetCashScenarioBands(
  monthlyNets: number[],
  fallbackMonthlyNet: number
): ScenarioNetBands {
  const samples = monthlyNets.filter((v) => Number.isFinite(v));

  if (samples.length < 3) {
    const base = Number.isFinite(fallbackMonthlyNet) ? fallbackMonthlyNet : 0;
    return {
      expectedMonthlyNet: base,
      bestMonthlyNet: base * 1.15,
      worstMonthlyNet: base * 0.85,
      sampleCount: samples.length,
      usedDefaults: true,
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const expectedMonthlyNet = medianOf(sorted);

  let worstIdx: number;
  let bestIdx: number;
  if (n >= 6) {
    worstIdx = 1; // 2nd-worst
    bestIdx = n - 2; // 2nd-best
  } else if (n >= 4) {
    worstIdx = 0;
    bestIdx = n - 1;
    // Prefer interior points when available
    worstIdx = Math.max(0, Math.floor(0.2 * (n - 1)));
    bestIdx = Math.min(n - 1, Math.ceil(0.8 * (n - 1)));
  } else {
    worstIdx = 0;
    bestIdx = n - 1;
  }

  return {
    expectedMonthlyNet,
    bestMonthlyNet: sorted[bestIdx]!,
    worstMonthlyNet: sorted[worstIdx]!,
    sampleCount: n,
    usedDefaults: false,
  };
}

export type MonthlyCashPoint = {
  endDate: string | null;
  netCash: number;
  ownerDraws: number;
};

/** Keep only full months ending on/before last reconciled date; take last `limit` months. */
export function selectReconciledFullMonths(
  points: MonthlyCashPoint[],
  lastReconciled: Date | null,
  limit = 6
): MonthlyCashPoint[] {
  const complete = points.filter((p) => {
    if (!Number.isFinite(p.netCash)) return false;
    if (!lastReconciled || !p.endDate) {
      // Without recon date, still drop an obvious trailing partial (handled by caller slicing)
      return true;
    }
    const end = new Date(`${p.endDate.slice(0, 10)}T23:59:59`);
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
  });

  return complete.slice(-limit);
}
