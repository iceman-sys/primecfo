import type { AIInsight } from '@/lib/financialData';

/** Each category+title appears at most once; first occurrence wins (deterministic insights are merged first). */
export function dedupeInsights(insights: AIInsight[]): AIInsight[] {
  const seen = new Set<string>();
  return insights.filter((insight) => {
    const key = `${insight.category.toLowerCase().trim()}:${insight.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
