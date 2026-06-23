import type { AIInsight, InsightSeverity } from '@/lib/financialData';
import type { FinancialContext } from '@/lib/ai/getFinancialContext';
import { evaluateCashRunway } from '@/lib/ai/cashRunwayInsight';
import { evaluateRevenueInsight } from '@/lib/ai/recurringRevenue';
import { applyInsightSeverityRules, type SeverityContext } from '@/lib/ai/severityRules';
import { applyInsightDataValidation } from '@/lib/ai/insightValidation';
import { dedupeInsights } from '@/lib/ai/dedupeInsights';
import { evaluateIncrementalMargin } from '@/lib/ai/growthCapacityInsight';
import { applyBalanceSheetInsights } from '@/lib/ai/balanceSheetInsights';
import { SEVERITY_ORDER } from '@/lib/ai/generateInsights';

function periodMonthsForRange(range: FinancialContext['reportRange']): number {
  if (range === '3m') return 3;
  if (range === '6m') return 6;
  return 12;
}

function isRunwayInsight(insight: Pick<AIInsight, 'title' | 'category' | 'metric'>): boolean {
  const hay = `${insight.title} ${insight.category} ${insight.metric ?? ''}`.toLowerCase();
  return hay.includes('runway') || hay.includes('cash runway') || hay.includes('breakeven');
}

function isRevenueDeterministicTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('recurring revenue') ||
    t.includes('seasonal revenue') ||
    t.includes('revenue composition') ||
    t.includes('revenue concentration') ||
    t.includes('revenue overview') ||
    t === 'revenue growth' ||
    t === 'revenue change'
  );
}

function isDuplicateRevenueInsight(insight: Pick<AIInsight, 'title' | 'category' | 'metricValue' | 'description'>): boolean {
  const hay = `${insight.category} ${insight.title}`.toLowerCase();
  if (!hay.includes('revenue')) return false;
  if (isRevenueDeterministicTitle(insight.title)) return true;
  const mv = (insight.metricValue ?? '').trim().toLowerCase();
  if (mv === 'n/a' || mv === 'na') return true;
  if (insight.description.toLowerCase().includes('insufficient prior-period')) return true;
  return false;
}

function isTotalRevenueDeclineInsight(
  insight: Pick<AIInsight, 'title' | 'category' | 'metric' | 'description' | 'urgency'>,
  context: FinancialContext
): boolean {
  const hay = `${insight.title} ${insight.category} ${insight.metric ?? ''}`.toLowerCase();
  if (!hay.includes('revenue')) return false;
  if (hay.includes('recurring') || hay.includes('seasonal') || hay.includes('composition') || hay.includes('concentration')) {
    return false;
  }

  const revPct = context.derived.revenueGrowthPct;
  if (revPct == null || revPct >= -5) return false;

  const desc = insight.description.toLowerCase();
  const declineWords =
    hay.includes('decline') ||
    hay.includes('decrease') ||
    hay.includes('drop') ||
    desc.includes('decline') ||
    desc.includes('sustainability') ||
    desc.includes('risk');

  return declineWords || insight.urgency === 'critical' || insight.urgency === 'warning';
}

function toInsight(
  partial: {
    title: string;
    description: string;
    urgency: InsightSeverity;
    category: string;
    metric?: string;
    metricValue?: string;
  },
  idSuffix: string
): AIInsight {
  return {
    id: `trend-aware-${idSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: partial.title,
    description: partial.description,
    urgency: partial.urgency,
    category: partial.category,
    metric: partial.metric,
    metricValue: partial.metricValue?.trim() ? partial.metricValue : undefined,
    createdAt: new Date().toISOString(),
    talkingPoints:
      partial.urgency === 'positive' || partial.urgency === 'info'
        ? [partial.description]
        : [
            partial.description,
            'This assessment uses net cash flow from your Cash Flow Statement and separates recurring from seasonal revenue.',
            'Review the underlying drivers before making major spending or hiring decisions.',
          ],
  };
}

function buildCashRunwayInsight(context: FinancialContext): AIInsight {
  const months = periodMonthsForRange(context.reportRange);
  const monthlyRevenue = context.summary.revenue > 0 ? context.summary.revenue / months : 0;

  const evalResult = evaluateCashRunway({
    trailingNetCashFlow: context.derived.trailingNetCashFlow,
    cashBalance: context.summary.cash,
    grossRunwayMonths: context.derived.runwayMonths,
    monthlyRevenue,
  });

  return toInsight(
    {
      title: evalResult.title,
      description: evalResult.message,
      urgency: evalResult.severity,
      category: 'Cash Runway',
      metric: evalResult.showRunway
        ? 'Cash Runway'
        : evalResult.metricValue
          ? 'Net Cash Flow'
          : undefined,
      metricValue: evalResult.metricValue || undefined,
    },
    'runway'
  );
}

function buildRevenueTrendInsight(context: FinancialContext): AIInsight | null {
  const evalResult = evaluateRevenueInsight({
    currentItems: context.derived.revenueLineItems,
    previousItems: context.derived.previousRevenueLineItems,
    totalRevenueCurrent: context.summary.revenue,
    totalRevenuePrevious: context.previousSummary?.revenue ?? 0,
  });

  if (!evalResult || evalResult.suppress) return null;

  const metricLabel =
    evalResult.title.includes('Composition') || evalResult.title.includes('Concentration')
      ? 'Revenue Mix'
      : 'Recurring Revenue Trend';

  return toInsight(
    {
      title: evalResult.title,
      description: evalResult.message,
      urgency: evalResult.severity,
      category: 'Revenue',
      metric: metricLabel,
      metricValue: evalResult.metricValue,
    },
    'revenue'
  );
}

function isMisleadingRevenueGrowthInsight(
  insight: Pick<AIInsight, 'title' | 'category' | 'metric' | 'description'>,
  context: FinancialContext
): boolean {
  const revPct = context.derived.revenueGrowthPct;
  if (revPct == null || revPct <= 0) return false;

  const hay = `${insight.title} ${insight.category} ${insight.metric ?? ''}`.toLowerCase();
  if (!hay.includes('revenue')) return false;
  if (hay.includes('recurring') || hay.includes('seasonal') || hay.includes('composition')) return false;

  return (
    hay.includes('growth') ||
    hay.includes('increase') ||
    hay.includes('realized') ||
    (insight.metric ?? '').toLowerCase().includes('revenue growth')
  );
}

function isGrowthCapacityLlmInsight(insight: Pick<AIInsight, 'category' | 'title'>): boolean {
  const hay = `${insight.category} ${insight.title}`.toLowerCase();
  return hay.includes('growth capacity') || hay.includes('capacity constraint');
}

function buildTotalRevenueGrowthInsight(context: FinancialContext): AIInsight | null {
  const revPct = context.derived.revenueGrowthPct;
  if (revPct == null || revPct <= 0) return null;

  return toInsight(
    {
      title: 'Revenue Growth',
      description: `Total revenue grew ${revPct.toFixed(1)}% period-over-period — a positive trend for the top line.`,
      urgency: 'positive',
      category: 'Revenue',
      metric: 'Revenue Growth',
      metricValue: `+${revPct.toFixed(1)}%`,
    },
    'rev-growth'
  );
}

function buildGrowthCapacityInsight(context: FinancialContext): AIInsight | null {
  if (!context.previousSummary) return null;

  const evalResult = evaluateIncrementalMargin({
    revenueCurrent: context.summary.revenue,
    revenuePrevious: context.previousSummary.revenue,
    netIncomeCurrent: context.summary.net_income,
    netIncomePrevious: context.previousSummary.net_income,
  });
  if (!evalResult) return null;

  return toInsight(
    {
      title: evalResult.title,
      description: evalResult.message,
      urgency: evalResult.severity,
      category: 'Growth Capacity',
      metric: 'Incremental Margin',
      metricValue: evalResult.metricValue,
    },
    'growth'
  );
}

/** Replace misleading threshold-based runway / revenue alerts with CFO-style judgments. */
export function applyTrendAwareInsightRules(
  insights: AIInsight[],
  context: FinancialContext
): AIInsight[] {
  const revenueInsight = buildRevenueTrendInsight(context);
  const totalGrowthInsight = buildTotalRevenueGrowthInsight(context);

  const deterministic = [
    buildCashRunwayInsight(context),
    revenueInsight,
    totalGrowthInsight && revenueInsight?.title !== 'Revenue Growth' ? totalGrowthInsight : null,
    buildGrowthCapacityInsight(context),
  ].filter((i): i is AIInsight => i != null);

  const filtered = insights.filter(
    (i) =>
      !isRunwayInsight(i) &&
      !isDuplicateRevenueInsight(i) &&
      !isTotalRevenueDeclineInsight(i, context) &&
      !isMisleadingRevenueGrowthInsight(i, context) &&
      !isGrowthCapacityLlmInsight(i)
  );

  const severityContext: SeverityContext = {
    runwayMonths: context.derived.runwayMonths,
    trailingNetCashFlow: context.derived.trailingNetCashFlow,
    revenueGrowthPct: context.derived.recurringRevenueChangePct ?? context.derived.revenueGrowthPct,
    profitMarginPct: context.summary.data_error ? null : context.summary.profit_margin_pct,
    expenseGrowthPct: context.derived.expenseGrowthPct,
    cashFlowPositive: (context.derived.trailingNetCashFlow ?? 0) >= 0,
  };

  const reconciled = [...deterministic, ...filtered].map((insight) => {
    if (insight.id.startsWith('trend-aware-') || insight.id.startsWith('bs-insight-')) return insight;
    return {
      ...insight,
      urgency: applyInsightSeverityRules(
        {
          title: insight.title,
          description: insight.description,
          urgency: insight.urgency,
          category: insight.category,
          metric: insight.metric,
          metricValue: insight.metricValue,
        },
        severityContext
      ),
    };
  });

  reconciled.sort((a, b) => (SEVERITY_ORDER[a.urgency] ?? 4) - (SEVERITY_ORDER[b.urgency] ?? 4));
  const withBalanceSheet = applyBalanceSheetInsights(reconciled, context.balanceSheet);
  const validated = applyInsightDataValidation(withBalanceSheet, context);
  return dedupeInsights(validated);
}
