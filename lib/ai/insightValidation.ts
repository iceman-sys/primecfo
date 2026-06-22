import type { AIInsight } from '@/lib/financialData';
import type { FinancialContext } from '@/lib/ai/getFinancialContext';

const ALARM_SEVERITIES = new Set(['critical', 'warning', 'watch']);

function isMissingMetric(metricValue?: string): boolean {
  if (!metricValue?.trim()) return true;
  const v = metricValue.trim().toLowerCase();
  return v === 'n/a' || v === 'na' || v === '—' || v === '-' || v === 'unavailable';
}

function describesMissingData(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('not available') ||
    t.includes('not directly provided') ||
    t.includes('data is lacking') ||
    t.includes('data is unavailable') ||
    t.includes('detailed data is lacking') ||
    t.includes('insufficient data') ||
    t.includes('not provided') ||
    t.includes('could not be determined') ||
    t.includes('no data')
  );
}

function isTaxInsight(insight: Pick<AIInsight, 'category' | 'title'>): boolean {
  const hay = `${insight.category} ${insight.title}`.toLowerCase();
  return hay.includes('tax');
}

function isOwnerCompInsight(insight: Pick<AIInsight, 'category' | 'title'>): boolean {
  const hay = `${insight.category} ${insight.title}`.toLowerCase();
  return hay.includes('owner compensation') || hay.includes('owner comp');
}

function isGenericBoilerplateTax(insight: Pick<AIInsight, 'description'>): boolean {
  const t = insight.description.toLowerCase();
  return (
    t.includes('consult with a tax advisor') ||
    t.includes('consult a tax advisor') ||
    t.includes('assess available tax deductions') ||
    t.includes('tax planning strategies')
  );
}

function isGrowthCapacityInsight(insight: Pick<AIInsight, 'category' | 'title'>): boolean {
  const hay = `${insight.category} ${insight.title}`.toLowerCase();
  return hay.includes('growth capacity') || hay.includes('capacity constraint') || hay.includes('capacity utilization');
}

export function shouldSuppressInsight(
  insight: AIInsight,
  context?: FinancialContext
): boolean {
  const category = insight.category.toLowerCase();
  const combined = `${insight.title} ${insight.description}`;

  if (isTaxInsight(insight)) {
    if (context?.derived.taxExpense == null) return true;
    if (isMissingMetric(insight.metricValue)) return true;
    if (describesMissingData(combined)) return true;
    if (isGenericBoilerplateTax(insight)) return true;
  }

  if (isOwnerCompInsight(insight)) {
    if (context?.derived.ownerCompensation == null) return true;
    if (isMissingMetric(insight.metricValue)) return true;
    if (describesMissingData(combined)) return true;
  }

  if (isGrowthCapacityInsight(insight)) {
    if (isMissingMetric(insight.metricValue)) return true;
    if (describesMissingData(combined)) return true;
    if (
      combined.toLowerCase().includes('capacity utilization') ||
      combined.toLowerCase().includes('not directly provided') ||
      combined.toLowerCase().includes('not available')
    ) {
      return true;
    }
  }

  if (isMissingMetric(insight.metricValue) && ALARM_SEVERITIES.has(insight.urgency)) {
    return true;
  }

  if (
    isMissingMetric(insight.metricValue) &&
    describesMissingData(combined) &&
    category !== 'cash runway'
  ) {
    return true;
  }

  return false;
}

/** Strip N/A alarming insights; demote any remaining missing-metric cards to neutral info. */
export function applyInsightDataValidation(
  insights: AIInsight[],
  context: FinancialContext
): AIInsight[] {
  return insights
    .filter((insight) => !shouldSuppressInsight(insight, context))
    .map((insight) => {
      if (!isMissingMetric(insight.metricValue)) return insight;
      if (ALARM_SEVERITIES.has(insight.urgency)) {
        return { ...insight, urgency: 'info' as const };
      }
      return insight;
    });
}
