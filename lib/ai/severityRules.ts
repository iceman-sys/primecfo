import type { InsightSeverity } from '@/lib/financialData';

const CRITICAL_WORDS = ['urgent', 'critical', 'immediate', 'danger', 'depleted', 'crisis'];
const ADVISORY_WORDS = ['concerning', 'declining', 'warning', 'attention', 'approaching'];
const POSITIVE_WORDS = ['improved', 'healthy', 'strong', 'growing', 'positive'];

export function getCashRunwaySeverity(months: number): InsightSeverity {
  if (months <= 1) return 'critical';
  if (months <= 3) return 'warning';
  if (months <= 6) return 'watch';
  return 'positive';
}

export function getRevenueGrowthSeverity(pctChange: number): InsightSeverity {
  if (pctChange <= -20) return 'critical';
  if (pctChange <= -10) return 'warning';
  if (pctChange <= 0) return 'watch';
  return 'positive';
}

export function getProfitMarginSeverity(margin: number): InsightSeverity {
  if (margin < -20) return 'critical';
  if (margin < 0) return 'warning';
  if (margin < 10) return 'watch';
  return 'positive';
}

export function getExpenseGrowthSeverity(pctChange: number): InsightSeverity {
  if (pctChange >= 50) return 'critical';
  if (pctChange >= 25) return 'warning';
  if (pctChange >= 10) return 'watch';
  return 'info';
}

function severityRank(s: InsightSeverity): number {
  const order: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    watch: 2,
    positive: 3,
    info: 4,
  };
  return order[s];
}

function pickMoreSevere(a: InsightSeverity, b: InsightSeverity): InsightSeverity {
  return severityRank(a) <= severityRank(b) ? a : b;
}

export function validateSeverityFromText(
  generatedSeverity: InsightSeverity,
  generatedText: string
): InsightSeverity {
  const textLower = generatedText.toLowerCase();
  let severity = generatedSeverity;

  if (CRITICAL_WORDS.some((w) => textLower.includes(w)) && severity === 'info') {
    severity = 'critical';
  } else if (ADVISORY_WORDS.some((w) => textLower.includes(w)) && (severity === 'info' || severity === 'watch')) {
    severity = 'warning';
  } else if (POSITIVE_WORDS.some((w) => textLower.includes(w)) && severity !== 'positive') {
    severity = 'positive';
  }

  return severity;
}

function parseRunwayMonths(metricValue?: string, description?: string): number | null {
  const sources = [metricValue ?? '', description ?? ''];
  for (const src of sources) {
    const m = src.match(/(\d+(?:\.\d+)?)\s*(?:months?|mo\b)/i);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

function parsePercent(metricValue?: string): number | null {
  if (!metricValue) return null;
  const m = metricValue.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export type SeverityContext = {
  runwayMonths?: number | null;
  revenueGrowthPct?: number | null;
  profitMarginPct?: number | null;
  expenseGrowthPct?: number | null;
};

export function applyInsightSeverityRules(
  insight: {
    title: string;
    description: string;
    urgency: InsightSeverity;
    category: string;
    metric?: string;
    metricValue?: string;
  },
  context: SeverityContext
): InsightSeverity {
  const combined = `${insight.title} ${insight.description} ${insight.metric ?? ''} ${insight.metricValue ?? ''}`;
  const category = insight.category.toLowerCase();
  const metric = (insight.metric ?? '').toLowerCase();
  const titleLower = insight.title.toLowerCase();

  let severity = insight.urgency;

  const runwayMonths =
    context.runwayMonths ??
    parseRunwayMonths(insight.metricValue, combined);
  if (
    runwayMonths != null &&
    (category.includes('cash runway') || metric.includes('runway') || titleLower.includes('runway'))
  ) {
    severity = pickMoreSevere(severity, getCashRunwaySeverity(runwayMonths));
  }

  const revPct = context.revenueGrowthPct ?? (metric.includes('revenue') ? parsePercent(insight.metricValue) : null);
  if (revPct != null && (category.includes('revenue') || metric.includes('revenue'))) {
    severity = pickMoreSevere(severity, getRevenueGrowthSeverity(revPct));
  }

  const marginPct =
    context.profitMarginPct ??
    (metric.includes('margin') || titleLower.includes('margin') ? parsePercent(insight.metricValue) : null);
  if (marginPct != null && (category.includes('margin') || metric.includes('margin'))) {
    severity = pickMoreSevere(severity, getProfitMarginSeverity(marginPct));
  }

  const expPct = context.expenseGrowthPct ?? (metric.includes('expense') ? parsePercent(insight.metricValue) : null);
  if (expPct != null && category.includes('expense')) {
    severity = pickMoreSevere(severity, getExpenseGrowthSeverity(expPct));
  }

  severity = validateSeverityFromText(severity, combined);
  return severity;
}
