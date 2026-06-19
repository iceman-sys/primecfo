import type { AIInsight, InsightSeverity } from '@/lib/financialData';
import type { FinancialContext } from '@/lib/ai/getFinancialContext';
import { evaluateCashRunway } from '@/lib/ai/cashRunwayInsight';
import { evaluateRevenueTrend } from '@/lib/ai/recurringRevenue';
import { applyInsightSeverityRules, type SeverityContext } from '@/lib/ai/severityRules';
import { applyInsightDataValidation } from '@/lib/ai/insightValidation';
import { applyBalanceSheetInsights } from '@/lib/ai/balanceSheetInsights';
import { SEVERITY_ORDER } from '@/lib/ai/generateInsights';

function isRunwayInsight(insight: Pick<AIInsight, 'title' | 'category' | 'metric'>): boolean {
  const hay = `${insight.title} ${insight.category} ${insight.metric ?? ''}`.toLowerCase();
  return hay.includes('runway') || hay.includes('cash runway');
}

function isTotalRevenueDeclineInsight(
  insight: Pick<AIInsight, 'title' | 'category' | 'metric' | 'description' | 'urgency'>,
  context: FinancialContext
): boolean {
  const hay = `${insight.title} ${insight.category} ${insight.metric ?? ''}`.toLowerCase();
  if (!hay.includes('revenue')) return false;
  if (hay.includes('recurring') || hay.includes('seasonal')) return false;

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
    id: `trend-aware-${idSuffix}-${Date.now()}`,
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
  const evalResult = evaluateCashRunway({
    trailingNetCashFlow: context.derived.trailingNetCashFlow,
    cashBalance: context.summary.cash,
    grossRunwayMonths: context.derived.runwayMonths,
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

function buildRevenueTrendInsight(context: FinancialContext): AIInsight {
  const evalResult = evaluateRevenueTrend({
    currentItems: context.derived.revenueLineItems,
    previousItems: context.derived.previousRevenueLineItems,
    totalRevenueCurrent: context.summary.revenue,
    totalRevenuePrevious: context.previousSummary?.revenue ?? 0,
  });

  return toInsight(
    {
      title: evalResult.title,
      description: evalResult.message,
      urgency: evalResult.severity,
      category: 'Revenue',
      metric: 'Recurring Revenue Trend',
      metricValue: evalResult.metricValue,
    },
    'revenue'
  );
}

/** Replace misleading threshold-based runway / revenue alerts with CFO-style judgments. */
export function applyTrendAwareInsightRules(
  insights: AIInsight[],
  context: FinancialContext
): AIInsight[] {
  const deterministic = [buildCashRunwayInsight(context), buildRevenueTrendInsight(context)];

  const filtered = insights.filter(
    (i) => !isRunwayInsight(i) && !isTotalRevenueDeclineInsight(i, context)
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
    if (insight.id.startsWith('trend-aware-')) return insight;
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
  return applyInsightDataValidation(withBalanceSheet, context);
}
