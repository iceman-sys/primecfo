import type { AIInsight } from '@/lib/financialData';

/** Each category+title appears at most once; suppress mutually exclusive revenue direction insights. */
export function dedupeInsights(insights: AIInsight[], revenueGrowthPct?: number | null): AIInsight[] {
  const seen = new Set<string>();
  return insights.filter((insight) => {
    const key = `${insight.category.toLowerCase().trim()}:${insight.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;

    if (revenueGrowthPct != null) {
      const hay = `${insight.title} ${insight.category}`.toLowerCase();
      const isTotalRevenue =
        hay.includes('revenue') &&
        !hay.includes('seasonal') &&
        !hay.includes('recurring') &&
        !hay.includes('composition') &&
        !hay.includes('concentration');
      if (isTotalRevenue) {
        const claimsUp =
          insight.title.toLowerCase().includes('growth') ||
          insight.title.toLowerCase().includes('realized') ||
          (insight.metricValue ?? '').trim().startsWith('+');
        const claimsDown =
          insight.title.toLowerCase().includes('decline') ||
          insight.title.toLowerCase().includes('decrease') ||
          (insight.metricValue ?? '').trim().startsWith('-');
        if (revenueGrowthPct >= 0 && claimsDown) return false;
        if (revenueGrowthPct < 0 && claimsUp) return false;
      }
    }

    seen.add(key);
    return true;
  });
}
