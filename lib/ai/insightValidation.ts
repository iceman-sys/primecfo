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

function isExpenseEfficiencyInsight(insight: Pick<AIInsight, 'title' | 'category' | 'description'>): boolean {
  const hay = `${insight.title} ${insight.category} ${insight.description}`.toLowerCase();
  return hay.includes('expense efficiency') || hay.includes('declining expense');
}

function isContradictoryRevenueInsight(
  insight: AIInsight,
  context?: FinancialContext
): boolean {
  if (!context) return false;
  const revPct = context.derived.revenueGrowthPct;
  if (revPct == null) return false;

  const hay = `${insight.title} ${insight.category} ${insight.metric ?? ''}`.toLowerCase();
  if (!hay.includes('revenue')) return false;
  if (hay.includes('seasonal') || hay.includes('recurring') || hay.includes('composition')) return false;

  const claimsGrowth =
    hay.includes('growth') ||
    hay.includes('realized') ||
    hay.includes('increase') ||
    (insight.metricValue ?? '').includes('+');
  const claimsDecline =
    hay.includes('decline') ||
    hay.includes('decrease') ||
    hay.includes('drop') ||
    (insight.metricValue ?? '').includes('-');

  if (revPct < -1 && claimsGrowth) return true;
  if (revPct > 1 && claimsDecline) return true;
  return false;
}

export function shouldSuppressInsight(
  insight: AIInsight,
  context?: FinancialContext
): boolean {
  const category = insight.category.toLowerCase();
  const combined = `${insight.title} ${insight.description}`;

  if (isExpenseEfficiencyInsight(insight)) return true;

  if (isContradictoryRevenueInsight(insight, context)) return true;

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

  if (
    combined.toLowerCase().includes('revenue overview') ||
    (insight.title.toLowerCase().includes('revenue') && isMissingMetric(insight.metricValue))
  ) {
    if (describesMissingData(combined) || isMissingMetric(insight.metricValue)) return true;
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

  if (insight.title.toLowerCase() === 'revenue overview' && isMissingMetric(insight.metricValue)) {
    return true;
  }

  return false;
}

function isProfitMarginInsight(insight: Pick<AIInsight, 'category' | 'title' | 'metric'>): boolean {
  const hay = `${insight.category} ${insight.title} ${insight.metric ?? ''}`.toLowerCase();
  if (hay.includes('gross margin') || hay.includes('incremental margin')) return false;
  return hay.includes('profit margin') || hay.includes('net margin') || hay.includes('net profit margin');
}

/** Align margin insights with KPI definition: net income ÷ revenue for the current period window. */
function normalizeProfitMarginInsight(insight: AIInsight, context: FinancialContext): AIInsight {
  if (!isProfitMarginInsight(insight)) return insight;
  if (context.summary.data_error) return insight;

  const margin = context.summary.profit_margin_pct;
  const change = context.derived.profitMarginChangePct;
  const metricValue = `${margin.toFixed(1)}%`;
  let description = insight.description;

  if (change != null && Math.abs(change) >= 0.05) {
    const dir = change >= 0 ? 'up' : 'down';
    description = `Net profit margin is ${margin.toFixed(1)}% for this period (${dir} ${Math.abs(change).toFixed(1)} pts vs prior). Margin = net income ÷ revenue using the same period totals as your dashboard KPI card.`;
  } else {
    description = `Net profit margin is ${margin.toFixed(1)}% for this period. Margin = net income ÷ revenue using the same period totals as your dashboard KPI card.`;
  }

  return {
    ...insight,
    metric: 'Profit Margin',
    metricValue,
    description,
  };
}

export function applyInsightDataValidation(
  insights: AIInsight[],
  context: FinancialContext
): AIInsight[] {
  return insights
    .filter((insight) => !shouldSuppressInsight(insight, context))
    .map((insight) => {
      const normalized = normalizeProfitMarginInsight(insight, context);
      if (!isMissingMetric(normalized.metricValue)) return normalized;
      if (ALARM_SEVERITIES.has(normalized.urgency)) {
        return { ...normalized, urgency: 'info' as const };
      }
      return normalized;
    });
}
