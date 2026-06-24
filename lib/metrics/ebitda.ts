/**
 * EBITDA = Net Operating Income + Interest + Depreciation & Amortization.
 *
 * Net Operating Income is already pre-interest and pre-income-tax, so the only
 * add-backs are interest expense and D&A. We never set EBITDA to net income and
 * never add back payroll taxes embedded in COGS.
 *
 * Fallback (only when the P&L has no Net Operating Income row): reconstruct from
 * net income by adding back interest, income taxes, and D&A — this still includes
 * the interest add-back, so EBITDA can never silently collapse to net income.
 */
export function computePeriodEbitda(input: {
  netOperatingIncome: number | null;
  interestExpense: number | null;
  depreciationAmortization: number | null;
  incomeTaxExpense?: number | null;
  netIncomeFallback?: number | null;
}): number | null {
  const interest = input.interestExpense ?? 0;
  const da = input.depreciationAmortization ?? 0;

  if (input.netOperatingIncome != null && Number.isFinite(input.netOperatingIncome)) {
    const ebitda = input.netOperatingIncome + interest + da;
    return ebitda > 0 ? ebitda : null;
  }

  if (
    input.netIncomeFallback != null &&
    Number.isFinite(input.netIncomeFallback) &&
    interest > 0
  ) {
    const ebitda = input.netIncomeFallback + interest + (input.incomeTaxExpense ?? 0) + da;
    return ebitda > 0 ? ebitda : null;
  }

  return null;
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
