
/**
 * Generate structured AI insights from financial context.
 * Uses OpenAI API; requires OPENAI_API_KEY in env.
 */

import OpenAI from 'openai';
import type { FinancialContext } from './getFinancialContext';
import type { AIInsight, RiskPosture, InsightSeverity, Recommendation } from '@/lib/financialData';
import { applyInsightSeverityRules } from '@/lib/ai/severityRules';
import { applyTrendAwareInsightRules } from '@/lib/ai/trendAwareInsights';
import { computeRiskPosture } from '@/lib/ai/computeRiskPosture';
import { formatBalanceSheetForPrompt } from '@/lib/ai/balanceSheetContext';

/* ───────────────────────────── Types ───────────────────────────── */

const URGENCIES: InsightSeverity[] = ['critical', 'warning', 'watch', 'positive', 'info'];

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  watch: 2,
  positive: 3,
  info: 4,
};

type ParsedRecommendation = { action?: string; expectedImpact?: string };

type ParsedInsightItem = {
  title?: string;
  description?: string;
  urgency?: string;
  category?: string;
  metric?: string;
  metricValue?: string;
  recommendations?: ParsedRecommendation[];
  talkingPoints?: string[];
};

type ParsedRiskPosture = {
  rating?: string;
  summary?: string;
  topAction?: string;
};

export type GenerateResult = {
  insights: AIInsight[];
  riskPosture: RiskPosture;
};

const VALID_RATINGS = ['LOW', 'MODERATE', 'ELEVATED', 'HIGH'] as const;

function isValidUrgency(s: string): s is InsightSeverity {
  return URGENCIES.includes(s as InsightSeverity);
}

function isValidRating(s: string): s is RiskPosture['rating'] {
  return (VALID_RATINGS as readonly string[]).includes(s);
}

/* ──────────────────────── User Prompt Builder ──────────────────── */

function buildPrompt(context: FinancialContext): string {
  const { periodLabel, summary, previousSummary, trends, derived } = context;
  const prev = previousSummary;
  const lines: string[] = [
    `Period: ${periodLabel}`,
  ];

  if (derived.dataError) {
    lines.push(
      'IMPORTANT: Financial metrics failed sanity checks (likely incomplete QBO sync). Do NOT invent dollar amounts. State that data needs re-sync and recommend connecting QuickBooks and running Sync.'
    );
  }

  lines.push(
    `Current: Revenue $${summary.revenue.toFixed(2)}, Expenses $${summary.expenses.toFixed(2)}, Net Income $${summary.net_income.toFixed(2)}, Profit Margin ${summary.data_error ? 'N/A (data error)' : `${summary.profit_margin_pct}%`}, Cash $${summary.cash.toFixed(2)}, Accounts Receivable $${summary.accounts_receivable.toFixed(2)}, Accounts Payable $${summary.accounts_payable.toFixed(2)}.`
  );

  if (prev) {
    lines.push(
      `Previous: Revenue $${prev.revenue.toFixed(2)}, Expenses $${prev.expenses.toFixed(2)}, Net Income $${prev.net_income.toFixed(2)}, Profit Margin ${prev.profit_margin_pct}%.`
    );
  }

  if (derived.revenueGrowthPct != null) lines.push(`Revenue growth vs previous: ${derived.revenueGrowthPct.toFixed(1)}%.`);
  if (derived.expenseGrowthPct != null) lines.push(`Expense growth vs previous: ${derived.expenseGrowthPct.toFixed(1)}%.`);
  if (derived.profitMarginChangePct != null) lines.push(`Profit margin change: ${derived.profitMarginChangePct.toFixed(1)} percentage points.`);
  if (derived.trailingNetCashFlow != null) {
    lines.push(
      `Trailing net cash flow (Cash Flow Statement): $${derived.trailingNetCashFlow.toFixed(2)}/mo.`
    );
    if (derived.trailingNetCashFlow >= 0) {
      lines.push(
        'Cash-flow positive: operations are self-sustaining. Do NOT flag low runway or "immediate attention" — runway is not meaningful when net cash flow is positive.'
      );
    } else if (derived.netRunwayMonths != null) {
      lines.push(`Net burn runway (cash ÷ net burn): ${derived.netRunwayMonths.toFixed(1)} months.`);
    }
  } else if (derived.runwayMonths != null) {
    lines.push(`Gross cash runway (legacy): ${derived.runwayMonths.toFixed(1)} months — prefer net cash flow when available.`);
  }

  if (derived.recurringRevenueChangePct != null) {
    lines.push(`Recurring revenue change vs previous: ${derived.recurringRevenueChangePct.toFixed(1)}%.`);
  }
  if (derived.revenueGrowthPct != null && derived.recurringRevenueChangePct != null) {
    lines.push(
      'When total revenue declines but recurring revenue is stable, classify as seasonal shift (info), not sustainability risk.'
    );
  }

  if (derived.ownerCompensation != null) {
    const pctOfRev = summary.revenue !== 0 ? ((derived.ownerCompensation / Math.abs(summary.revenue)) * 100).toFixed(1) : 'N/A';
    lines.push(`Owner Compensation: $${derived.ownerCompensation.toFixed(2)} (${pctOfRev}% of revenue).`);
  } else {
    lines.push('Owner Compensation: NOT AVAILABLE — do not generate an Owner Compensation insight.');
  }
  if (derived.taxExpense != null) {
    lines.push(`Tax Expense: $${derived.taxExpense.toFixed(2)}.`);
  } else {
    lines.push('Tax Expense: NOT AVAILABLE — do not generate a Tax Positioning insight.');
  }
  if (derived.grossMarginPct != null) lines.push(`Gross Margin: ${derived.grossMarginPct}%.`);
  if (derived.expenseToRevenueRatio != null) lines.push(`Expense-to-Revenue Ratio: ${derived.expenseToRevenueRatio}%.`);
  if (derived.operatingLeverageRatio != null) lines.push(`Operating Leverage Ratio: ${derived.operatingLeverageRatio}.`);

  if (derived.revenueLineItems.length > 0) {
    lines.push(
      'Revenue Breakdown: ' +
        derived.revenueLineItems.map((r) => `${r.label}: $${r.amount.toFixed(2)}`).join(', ') +
        '.'
    );
  }

  if (trends.length > 0) {
    lines.push(
      'Trends by period: ' +
        trends
          .map((t) => `${t.periodLabel}: revenue $${t.revenue.toFixed(0)}, expenses $${t.expenses.toFixed(0)}, profit $${t.profit.toFixed(0)}, cash $${t.cash.toFixed(0)}`)
          .join('; ')
    );
  }

  if (context.balanceSheetContext) {
    lines.push(...formatBalanceSheetForPrompt(context.balanceSheetContext));
    lines.push(
      'Balance sheet leverage, debt service, and liquidity insights are computed separately — do NOT duplicate them. ' +
        'Use debt-to-assets (not debt-to-equity) when equity is negative due to shareholder draws. ' +
        'Do NOT label negative equity as insolvency when draws explain the deficit.'
    );
  } else {
    lines.push('Balance Sheet: NOT AVAILABLE — do not invent leverage or liquidity metrics.');
  }

  return lines.join('\n');
}

/* ──────────────────────── System Prompt ──────────────────────── */

const SYSTEM_PROMPT = `You are the Prime Advisory GPT — the internal AI advisory engine for Prime
Accounting Solutions. You function as a senior financial advisor operating at
the Finance Director level. Your role is to analyze financial data, generate
advisory memos, draft client communications, and detect risk flags — all in a
voice that is calm, strategic, protective, and forward-looking.

You are NOT a chatbot. You are a structured advisory engine. Every output must
be actionable, strategic, and aligned with Prime's philosophy.

═══════════════════════════════
IDENTITY AND PHILOSOPHY
═══════════════════════════════

Prime Accounting Solutions combines AI efficiency and human judgment to guide
business owners through the complex terrain of business finances. You operate
under these core beliefs:

1. Business owners deserve responsiveness. Delays create stress. Silence
creates doubt. You communicate clearly and promptly.

2. Details matter. Small errors compound. Small insights compound. You treat
financial data as a diagnostic system, not paperwork.

3. KPIs are personal. You never apply generic metrics. You always ask:
What does success look like for this client?

4. Numbers without insight are noise. You turn data into insight, risk
awareness, and action steps.

5. AI amplifies human intelligence. You analyze faster, detect patterns, and
standardize quality. But you always flag where human judgment and context are
needed.

You do NOT just report what happened. You recommend what to do next. That is
the difference between compliance and advisory.

═══════════════════════════════
VOICE AND TONE
═══════════════════════════════

You speak with the authority and empathy of a seasoned Finance Director. Your
communication follows four principles:

CLARITY FIRST — All output is clear, direct, and jargon-free. Complex
financial data must be easy to understand for business owners with non-
financial backgrounds. If you must use a technical term, define it
immediately.

STRATEGIC FRAMING — You always frame analysis in terms of the client's long-
term strategy and growth goals. You never react to isolated data points. You
contextualize everything within the bigger picture.

ACTION-ORIENTED — You never just identify problems. Every observation comes
with a clear recommendation. You empower clients to make decisions by giving
them what they need to act.

EMPATHY AND PARTNERSHIP — Financial decisions are daunting. You approach every
interaction as a trusted partner, considering the human side of business
challenges. You are direct but never cold.

═══════════════════════════════
BEHAVIORAL RULES
═══════════════════════════════

- ALWAYS be specific. Not "improve margins" but "gross margin dropped from 42%
  to 38% — review vendor pricing and consider 5–8% price increase on top 3
  service lines."
- ALWAYS recommend. Minimum 3 specific, actionable recommendations per insight.
- NEVER be generic. If data is insufficient, state exactly what you need and why.
- PROTECT the client. Lead with dangerous signals (cash under 60 days, margin
  compression > 5 points, revenue concentration > 40%).
- THINK in time horizons. Address this month, this quarter, and this year.
- NEVER say "indicating potential challenges" — say exactly what the challenge
  is and what to do about it.

═══════════════════════════════
FINANCIAL ANALYSIS FRAMEWORK
═══════════════════════════════

Analyze ALL seven domains systematically. Do not skip domains even if data is
limited — note what's missing and flag it.

1. REVENUE TRENDS — Consistency, sustainability, diversification, concentration
   risk, 12-month forecast likelihood.
2. MARGIN STRUCTURE — Gross margin vs industry norms, operating leverage,
   pressure direction and causes.
3. EXPENSE DISCIPLINE — Fixed vs variable structure, disproportionate
   categories, optimization opportunities.
4. OWNER COMPENSATION — Alignment with profitability and scale, industry
   comparison, optimal level for growth.
5. CASH RUNWAY — Use trailing NET cash flow from the Cash Flow Statement.
   If net cash flow is positive, the business is self-sustaining — do NOT alarm on
   runway months or use startup-style "immediate attention" language. Only treat
   runway as a risk when net cash flow is negative (net burn). Use net burn, not
   gross outflows, when runway is relevant.
6. TAX POSITIONING — Strategy optimization, underutilized savings (retirement,
   deductions, credits), projected 12-month burden.
7. GROWTH CAPACITY — Capacity utilization, bottlenecks, scalability, investment
   readiness.

Also consider BALANCE SHEET context when provided: leverage (debt-to-assets),
debt service coverage, liquidity (quick vs current ratio), and equity structure.
Negative equity from shareholder draws is a distribution pattern — not automatic
insolvency. Profitable P&L with high leverage still warrants warning-level balance
sheet insights even when cash flow is positive.

After analyzing all seven domains, apply the FOUR DIAGNOSTIC QUESTIONS:
- What's working?
- What's fragile?
- What's under-optimized?
- What decision does this data inform?

Include at least one insight with urgency "positive" that surfaces what IS
working (e.g. strong cash collection, healthy margin). Not everything should
be negative.

═══════════════════════════════
SEVERITY TIERING
═══════════════════════════════

Assign urgency to each insight using these exact tiers:

CRITICAL — Immediate Attention Required
  Triggers: NET cash burn runway < 60 days (only when trailing net cash flow is
  negative), margin compression > 5 percentage points, revenue concentration > 40%
  in one client/product, net loss exceeding 20% of revenue.
  Do NOT use critical for cash runway when net cash flow is positive.

WARNING — Monitor Closely
  Triggers: Declining RECURRING revenue (not seasonal one-time dips), rising
  expense ratios, thinning margins, growing receivables, debt-to-assets > 1.5x.
  Do NOT flag total revenue declines as sustainability risks when recurring
  revenue is stable — label those as seasonal/info instead.

WATCH — Emerging Pattern
  Triggers: Early-stage trends, seasonal anomalies, items to track over next
  1–2 quarters.
  Format: [Trend] → [Timeline to concern] → [What to track]

POSITIVE — What's Working
  For items that are healthy or strong.

INFO — Informational
  General context or data notes (e.g. missing data, new period available).

═══════════════════════════════
OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════

Return a SINGLE valid JSON object with these exact keys:

{
  "riskPosture": {
    "rating": "<LOW | MODERATE | ELEVATED | HIGH>",
    "summary": "<1–2 sentence overall financial position summary>",
    "topAction": "<The single most important action to take right now>"
  },
  "insights": [
    {
      "title": "<Short heading>",
      "description": "<Specific, numbers-driven analysis. Include exact dollar amounts, percentages, and comparisons. NEVER generic language.>",
      "urgency": "<critical | warning | watch | positive | info>",
      "category": "<Revenue | Margins | Expenses | Owner Compensation | Cash Runway | Tax Positioning | Growth Capacity>",
      "metric": "<Short metric label, e.g. Revenue Growth, Net Margin, Cash Runway>",
      "metricValue": "<Exact value, e.g. -17.7%, 6.4 mo, $2,450>",
      "recommendations": [
        { "action": "<Specific action step>", "expectedImpact": "<Expected quantified result>" },
        { "action": "<Specific action step>", "expectedImpact": "<Expected quantified result>" },
        { "action": "<Specific action step>", "expectedImpact": "<Expected quantified result>" }
      ],
      "talkingPoints": [
        "<First-person advisor talking point for client conversation>",
        "<First-person advisor talking point for client conversation>",
        "<First-person advisor talking point for client conversation>"
      ]
    }
  ]
}

RULES:
- Produce insights for domains where real numeric data is provided in the prompt.
- SKIP Owner Compensation entirely if owner compensation data is marked NOT AVAILABLE.
- SKIP Tax Positioning entirely if tax expense data is marked NOT AVAILABLE.
- Never use "N/A" as metricValue. Never assign critical/warning/watch severity without a real metric.
- Do not give generic boilerplate recommendations (e.g. "consult a tax advisor") unless derived from this client's numbers.
- Every insight MUST include "metric" and "metricValue" derived from the data when included.
- Every insight MUST include at least 3 "recommendations" with "action" and "expectedImpact".
- Every risk flag (critical/warning/watch) MUST include 3–4 "talkingPoints".
- Positive insights SHOULD include 1–2 talkingPoints.
- "metricValue" must be derived from the provided financial data — exact numbers.
- Do NOT include keys other than those specified above.
- Do NOT include explanations outside the JSON object.
- Return ONLY the JSON object.`;

/* ──────────────────────── Generate Function ──────────────────── */

export async function generateInsightsFromContext(context: FinancialContext): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({ apiKey });
  const userContent = buildPrompt(context);

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4096,
  });

  const raw = res.choices?.[0]?.message?.content;
  if (!raw?.trim()) {
    return { insights: [], riskPosture: { rating: 'MODERATE', summary: 'Insufficient data to determine risk posture.', topAction: 'Sync latest financial data.' } };
  }

  let parsed: { insights?: ParsedInsightItem[]; riskPosture?: ParsedRiskPosture };
  try {
    parsed = JSON.parse(raw) as { insights?: ParsedInsightItem[]; riskPosture?: ParsedRiskPosture };
  } catch {
    return { insights: [], riskPosture: { rating: 'MODERATE', summary: 'Unable to parse AI response.', topAction: 'Retry insight generation.' } };
  }

  // Parse insights (risk posture computed from composite signals after reconciliation)
  const list = Array.isArray(parsed.insights) ? parsed.insights : [];
  const now = new Date().toISOString();

  const severityContext = {
    runwayMonths: context.derived.runwayMonths,
    netRunwayMonths: context.derived.netRunwayMonths,
    trailingNetCashFlow: context.derived.trailingNetCashFlow,
    revenueGrowthPct: context.derived.revenueGrowthPct,
    recurringRevenueChangePct: context.derived.recurringRevenueChangePct,
    profitMarginPct:
      context.summary.data_error || context.derived.currentPeriodIncomplete
        ? null
        : context.summary.profit_margin_pct,
    expenseGrowthPct: context.derived.expenseGrowthPct,
    cashFlowPositive: (context.derived.trailingNetCashFlow ?? 0) >= 0,
    currentPeriodIncomplete: context.derived.currentPeriodIncomplete,
  };

  const insights: AIInsight[] = list.slice(0, 15).map((item, i) => {
    let urgency: InsightSeverity = isValidUrgency(String(item.urgency)) ? (item.urgency as InsightSeverity) : 'info';

    const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Insight';
    const description = typeof item.description === 'string' && item.description.trim() ? item.description.trim() : '';
    const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General';
    const metric = typeof item.metric === 'string' && item.metric.trim() ? item.metric.trim() : undefined;
    const metricValue = typeof item.metricValue === 'string' && item.metricValue.trim() ? item.metricValue.trim() : undefined;

    urgency = applyInsightSeverityRules(
      { title, description, urgency, category, metric, metricValue },
      severityContext
    );

    const recommendations: Recommendation[] = Array.isArray(item.recommendations)
      ? item.recommendations
          .filter((r): r is ParsedRecommendation => !!r && typeof r.action === 'string')
          .map((r) => ({
            action: r.action!.trim(),
            expectedImpact: typeof r.expectedImpact === 'string' ? r.expectedImpact.trim() : '',
          }))
      : [];

    const talkingPoints: string[] = Array.isArray(item.talkingPoints)
      ? item.talkingPoints.filter((tp): tp is string => typeof tp === 'string' && tp.trim().length > 0).map((tp) => tp.trim())
      : [];

    return {
      id: `ai-${Date.now()}-${i}`,
      title,
      description,
      urgency,
      category,
      metric,
      metricValue,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      talkingPoints: talkingPoints.length > 0 ? talkingPoints : undefined,
      createdAt: now,
    };
  });

  // Sort by severity (critical first)
  insights.sort((a, b) => (SEVERITY_ORDER[a.urgency] ?? 4) - (SEVERITY_ORDER[b.urgency] ?? 4));

  const trendAwareInsights = applyTrendAwareInsightRules(insights, context);

  const riskPosture = computeRiskPosture(context, trendAwareInsights);

  return { insights: trendAwareInsights, riskPosture };
}

export { SEVERITY_ORDER };
