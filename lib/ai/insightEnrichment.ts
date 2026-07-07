import type { AIInsight } from '@/lib/financialData';
import type { ReportRange } from '@/lib/qbo/reports';

function haystack(insight: Pick<AIInsight, 'title' | 'category' | 'metric'>): string {
  return `${insight.title} ${insight.category} ${insight.metric ?? ''}`.toLowerCase();
}

export function reportLinkForInsight(
  insight: Pick<AIInsight, 'title' | 'category' | 'metric'>,
  range: ReportRange = '3m'
): { href: string; label: string } | undefined {
  const hay = haystack(insight);

  if (
    hay.includes('cash') ||
    hay.includes('runway') ||
    hay.includes('breakeven') ||
    hay.includes('draw') ||
    hay.includes('debt service')
  ) {
    return {
      href: `/reports?tab=reports&report=cash_flow&range=${range}`,
      label: 'Cash Flow Statement',
    };
  }

  if (
    hay.includes('revenue') ||
    hay.includes('margin') ||
    hay.includes('profit') ||
    hay.includes('growth capacity') ||
    hay.includes('ebitda')
  ) {
    return {
      href: `/reports?tab=reports&report=pnl&range=${range}`,
      label: 'P&L',
    };
  }

  if (
    hay.includes('leverage') ||
    hay.includes('liquidity') ||
    hay.includes('equity') ||
    hay.includes('ratio') ||
    hay.includes('balance sheet') ||
    hay.includes('solvency')
  ) {
    return {
      href: `/reports?tab=reports&report=balance_sheet&range=${range}`,
      label: 'Balance Sheet',
    };
  }

  return undefined;
}

const NEXT_STEP_RULES: Array<{
  match: (insight: AIInsight) => boolean;
  step: string;
}> = [
  {
    match: (i) => i.title.toLowerCase().includes('thin quick liquidity'),
    step:
      'Review payables timing over the next 30 days and ensure cash on hand covers obligations before taking any large distributions.',
  },
  {
    match: (i) =>
      i.title.toLowerCase().includes('moderate leverage') ||
      (i.metric === 'Debt-to-EBITDA' && i.urgency === 'info'),
    step: 'Monitor debt paydown schedule — keep EBITDA at or above current levels to maintain coverage.',
  },
  {
    match: (i) => i.title.toLowerCase().includes('operating near breakeven'),
    step: 'Watch for months where draws or one-time costs push net burn materially negative.',
  },
  {
    match: (i) => i.title.toLowerCase().includes('elevated leverage'),
    step: 'Prioritize a deleveraging plan and review high-interest revolving balances for paydown.',
  },
  {
    match: (i) => i.title.toLowerCase().includes('high leverage'),
    step: 'Build debt paydown into your cash flow plan and discuss refinancing options with your advisor.',
  },
  {
    match: (i) => i.title.toLowerCase().includes('tight debt service'),
    step: 'Map loan payment due dates against cash collection cycles before taking distributions.',
  },
  {
    match: (i) => i.title.toLowerCase().includes('cash runway') && i.urgency !== 'positive',
    step: 'Review the drivers of negative cash flow — draws, loan payments, and operating outflows — before major spending.',
  },
  {
    match: (i) =>
      i.urgency === 'watch' &&
      !i.description.toLowerCase().includes('next step:') &&
      (i.title.toLowerCase().includes('revenue') || i.category.toLowerCase().includes('revenue')),
    step: 'Validate whether the trend is recurring or seasonal before adjusting hiring or spend.',
  },
];

function findNextStep(insight: AIInsight): { step: string; explicit: boolean } | null {
  for (const rule of NEXT_STEP_RULES) {
    if (rule.match(insight)) return { step: rule.step, explicit: true };
  }
  if (
    (insight.urgency === 'warning' || insight.urgency === 'watch' || insight.urgency === 'critical') &&
    !insight.description.toLowerCase().includes('next step:')
  ) {
    return {
      step: 'Discuss this trend with your advisor and validate the underlying numbers in QuickBooks before acting.',
      explicit: false,
    };
  }
  return null;
}

export function enrichInsights(
  insights: AIInsight[],
  range: ReportRange = '3m'
): AIInsight[] {
  return insights.map((insight) => {
    let description = insight.description;
    if (insight.urgency !== 'positive' && !description.toLowerCase().includes('next step:')) {
      const match = findNextStep(insight);
      if (match && (match.explicit || insight.urgency !== 'info')) {
        description = `${description} Next step: ${match.step}`;
      }
    }

    const reportLink = insight.reportLink ?? reportLinkForInsight(insight, range);

    return reportLink || description !== insight.description
      ? { ...insight, description, reportLink }
      : insight;
  });
}
