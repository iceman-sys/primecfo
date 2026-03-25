
/**
 * Generate structured AI insights from financial context.
 * Uses OpenAI API; requires OPENAI_API_KEY in env.
 */

import OpenAI from 'openai';
import type { FinancialContext } from './getFinancialContext';
import type { AIInsight, RiskPosture, InsightSeverity, Recommendation } from '@/lib/financialData';

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
    `Current: Revenue $${summary.revenue.toFixed(2)}, Expenses $${summary.expenses.toFixed(2)}, Net Income $${summary.net_income.toFixed(2)}, Profit Margin ${summary.profit_margin_pct}%, Cash $${summary.cash.toFixed(2)}, Accounts Receivable $${summary.accounts_receivable.toFixed(2)}, Accounts Payable $${summary.accounts_payable.toFixed(2)}.`,
  ];

  if (prev) {
    lines.push(
      `Previous: Revenue $${prev.revenue.toFixed(2)}, Expenses $${prev.expenses.toFixed(2)}, Net Income $${prev.net_income.toFixed(2)}, Profit Margin ${prev.profit_margin_pct}%.`
    );
  }

  if (derived.revenueGrowthPct != null) lines.push(`Revenue growth vs previous: ${derived.revenueGrowthPct.toFixed(1)}%.`);
  if (derived.expenseGrowthPct != null) lines.push(`Expense growth vs previous: ${derived.expenseGrowthPct.toFixed(1)}%.`);
  if (derived.profitMarginChangePct != null) lines.push(`Profit margin change: ${derived.profitMarginChangePct.toFixed(1)} percentage points.`);
  if (derived.runwayMonths != null) lines.push(`Cash runway: ${derived.runwayMonths.toFixed(1)} months.`);

  if (derived.ownerCompensation != null) {
    const pctOfRev = summary.revenue !== 0 ? ((derived.ownerCompensation / Math.abs(summary.revenue)) * 100).toFixed(1) : 'N/A';
    lines.push(`Owner Compensation: $${derived.ownerCompensation.toFixed(2)} (${pctOfRev}% of revenue).`);
  }
  if (derived.taxExpense != null) lines.push(`Tax Expense: $${derived.taxExpense.toFixed(2)}.`);
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
5. CASH RUNWAY — Current runway, receivables collection, working capital
   efficiency.
6. TAX POSITIONING — Strategy optimization, underutilized savings (retirement,
   deductions, credits), projected 12-month burden.
7. GROWTH CAPACITY — Capacity utilization, bottlenecks, scalability, investment
   readiness.

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
  Triggers: Cash runway < 60 days, margin compression > 5 percentage points,
  revenue concentration > 40% in one client/product, net loss exceeding 20%
  of revenue.
  Format: [What the data shows] → [Why it is critical] → [Immediate action]

WARNING — Monitor Closely
  Triggers: Declining revenue trends, rising expense ratios, thinning margins,
  growing receivables.
  Format: [What the data shows] → [Potential outcome] → [Preventive action]

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
- You MUST produce at least one insight for EACH of the 7 analysis domains.
- Every insight MUST include "metric" and "metricValue" derived from the data.
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

  // Parse risk posture
  const rp = parsed.riskPosture;
  const riskPosture: RiskPosture = {
    rating: rp && typeof rp.rating === 'string' && isValidRating(rp.rating.toUpperCase())
      ? rp.rating.toUpperCase() as RiskPosture['rating']
      : 'MODERATE',
    summary: rp && typeof rp.summary === 'string' && rp.summary.trim() ? rp.summary.trim() : 'Risk posture could not be determined from available data.',
    topAction: rp && typeof rp.topAction === 'string' && rp.topAction.trim() ? rp.topAction.trim() : '',
  };

  // Parse insights
  const list = Array.isArray(parsed.insights) ? parsed.insights : [];
  const now = new Date().toISOString();

  const insights: AIInsight[] = list.slice(0, 15).map((item, i) => {
    const urgency: InsightSeverity = isValidUrgency(String(item.urgency)) ? (item.urgency as InsightSeverity) : 'info';

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
      title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Insight',
      description: typeof item.description === 'string' && item.description.trim() ? item.description.trim() : '',
      urgency,
      category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General',
      metric: typeof item.metric === 'string' && item.metric.trim() ? item.metric.trim() : undefined,
      metricValue: typeof item.metricValue === 'string' && item.metricValue.trim() ? item.metricValue.trim() : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      talkingPoints: talkingPoints.length > 0 ? talkingPoints : undefined,
      createdAt: now,
    };
  });

  // Sort by severity (critical first)
  insights.sort((a, b) => (SEVERITY_ORDER[a.urgency] ?? 4) - (SEVERITY_ORDER[b.urgency] ?? 4));

  return { insights, riskPosture };
}

export { SEVERITY_ORDER };
