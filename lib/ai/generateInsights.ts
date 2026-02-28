/**
 * Generate plain-English AI insights from financial context.
 * Uses OpenAI API; requires OPENAI_API_KEY in env.
 */

import OpenAI from 'openai';
import type { FinancialContext } from './getFinancialContext';
import type { AIInsight } from '@/lib/financialData';

const URGENCIES = ['action_required', 'watch', 'positive', 'info'] as const;
type Urgency = (typeof URGENCIES)[number];

function isValidUrgency(s: string): s is Urgency {
  return URGENCIES.includes(s as Urgency);
}

function buildPrompt(context: FinancialContext): string {
  const { periodLabel, summary, previousSummary, trends, derived } = context;
  const prev = previousSummary;
  const lines: string[] = [
    `Period: ${periodLabel}`,
    `Current: Revenue $${summary.revenue.toFixed(2)}, Expenses $${summary.expenses.toFixed(2)}, Net Income $${summary.net_income.toFixed(2)}, Profit Margin ${summary.profit_margin_pct}%, Cash $${summary.cash.toFixed(2)}, Accounts Receivable $${summary.accounts_receivable.toFixed(2)}.`,
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
  if (trends.length > 0) {
    lines.push('Trends by period: ' + trends.map((t) => `${t.periodLabel}: revenue $${t.revenue.toFixed(0)}, expenses $${t.expenses.toFixed(0)}, profit $${t.profit.toFixed(0)}, cash $${t.cash.toFixed(0)}`).join('; '));
  }
  return lines.join('\n');
}

export async function generateInsightsFromContext(context: FinancialContext): Promise<AIInsight[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({ apiKey });
  const userContent = buildPrompt(context);

  const systemContent = `You are a financial analyst. Given the following metrics for a business, output 3 to 6 short, plain-English insights. Be factual and neutral. Examples:
- "Revenue increased 12% compared to last quarter."
- "Operating expenses increased faster than revenue."
- "Profit margins declined over the last 3 months."
- "Cash runway estimated at 6.4 months."
Return a single JSON object with key "insights" whose value is an array of objects. Each object must have: "title" (string, short heading), "description" (string, one sentence), "urgency" (one of: "action_required", "watch", "positive", "info"), "category" (string, e.g. "Revenue", "Expenses", "Cash", "Profitability"). Optional: "metric", "metricValue". No other keys.`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1024,
  });

  const raw = res.choices?.[0]?.message?.content;
  if (!raw?.trim()) return [];

  let parsed: { insights?: Array<{ title?: string; description?: string; urgency?: string; category?: string; metric?: string; metricValue?: string }> };
  try {
    parsed = JSON.parse(raw) as { insights?: unknown[] };
  } catch {
    return [];
  }

  const list = Array.isArray(parsed.insights) ? parsed.insights : [];
  const now = new Date().toISOString();

  return list.slice(0, 10).map((item, i) => ({
    id: `ai-${Date.now()}-${i}`,
    title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Insight',
    description: typeof item.description === 'string' && item.description.trim() ? item.description.trim() : '',
    urgency: isValidUrgency(String(item.urgency)) ? (item.urgency as Urgency) : 'info',
    category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General',
    metric: typeof item.metric === 'string' ? item.metric : undefined,
    metricValue: typeof item.metricValue === 'string' ? item.metricValue : undefined,
    createdAt: now,
  })) as AIInsight[];
}
