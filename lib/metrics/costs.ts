/** COGS + operating expenses — full cost stack for P&L comparisons. */
export function totalCosts(cogs: number | undefined, operatingExpenses: number | undefined): number {
  return Math.abs(cogs ?? 0) + Math.abs(operatingExpenses ?? 0);
}
