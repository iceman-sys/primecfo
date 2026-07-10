/** Human-readable subscription label — avoids "ACT · Act" duplication. */
export function formatSubscriptionLabel(
  planName: string,
  interval: 'month' | 'year' | null | undefined
): string {
  if (interval === 'year') return `${planName} · Billed annually`;
  if (interval === 'month') return `${planName} · Billed monthly`;
  return planName;
}
