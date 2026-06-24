/**
 * EBITDA = Net Operating Income + Interest + Depreciation & Amortization (+ income taxes when present).
 * Does NOT use net income and does NOT add back payroll taxes embedded in COGS.
 */
export function computePeriodEbitda(input: {
  netOperatingIncome: number | null;
  interestExpense: number | null;
  depreciationAmortization: number | null;
  incomeTaxExpense?: number | null;
}): number | null {
  if (input.netOperatingIncome == null || !Number.isFinite(input.netOperatingIncome)) return null;

  const ebitda =
    input.netOperatingIncome +
    (input.interestExpense ?? 0) +
    (input.depreciationAmortization ?? 0) +
    (input.incomeTaxExpense ?? 0);

  return ebitda > 0 ? ebitda : null;
}

export function annualizeEbitda(periodEbitda: number, periodMonths: number): number | null {
  if (periodEbitda <= 0 || periodMonths <= 0) return null;
  return (periodEbitda / periodMonths) * 12;
}

export function computeDebtToEbitda(
  totalDebt: number | null,
  annualizedEbitda: number | null
): number | null {
  if (totalDebt == null || annualizedEbitda == null || annualizedEbitda <= 0) return null;
  return Math.round((totalDebt / annualizedEbitda) * 100) / 100;
}
