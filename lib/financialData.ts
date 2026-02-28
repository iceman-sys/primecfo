/**
 * Types and formatters for dashboard UI (aligned with finance-dashboard).
 * Data is supplied from API; this file only provides types and helpers.
 */

export interface Client {
  id: string;
  name: string;
  email: string;
  companyName: string;
  industry: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  qbStatus: 'connected' | 'disconnected' | 'expired' | 'error';
  lastSync: string;
  createdAt: string;
  notes?: string | null;
}

export interface MetricCard {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  format: 'currency' | 'currencyExact' | 'percentage' | 'number' | 'days';
  trend: 'up' | 'down' | 'flat';
  trendIsGood: boolean;
  icon: string;
  color: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  urgency: 'action_required' | 'watch' | 'positive' | 'info';
  category: string;
  metric?: string;
  metricValue?: string;
  createdAt: string;
}

export interface ReportLineItem {
  label: string;
  current: number;
  previous: number;
  isHeader?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  cash: number;
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

export function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

/** Full amount with cents (no K/M). Use for Balance Sheet–derived values (e.g. Cash, A/R). */
export function formatExactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format currency or show "-" for empty / dash values (e.g. report totals). */
export function formatCurrencyOrDash(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const s = String(value).trim();
  if (s === '' || s === '-') return '-';
  const num = parseFloat(s.replace(/[$,]/g, ''));
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
}

export function formatPercentChange(current: number, previous: number): string {
  if (previous === 0) return 'N/A';
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

export function getPercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Build trend and trendIsGood from current vs previous value. */
export function getTrend(
  current: number,
  previous: number,
  higherIsGood: boolean
): { trend: 'up' | 'down' | 'flat'; trendIsGood: boolean } {
  if (previous === current) return { trend: 'flat', trendIsGood: true };
  const up = current > previous;
  return {
    trend: up ? 'up' : 'down',
    trendIsGood: higherIsGood ? up : !up,
  };
}

export function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Placeholder mock data for dashboard/insights until real metrics API exists
export const mockMetrics: MetricCard[] = [
  { id: '1', title: 'Total Revenue', value: 0, previousValue: 0, format: 'currency', trend: 'flat', trendIsGood: true, icon: 'DollarSign', color: 'emerald' },
  { id: '2', title: 'Total Expenses', value: 0, previousValue: 0, format: 'currency', trend: 'flat', trendIsGood: false, icon: 'CreditCard', color: 'red' },
  { id: '3', title: 'Net Profit', value: 0, previousValue: 0, format: 'currency', trend: 'flat', trendIsGood: true, icon: 'TrendingUp', color: 'blue' },
  { id: '4', title: 'Profit Margin', value: 0, previousValue: 0, format: 'percentage', trend: 'flat', trendIsGood: true, icon: 'PieChart', color: 'violet' },
  { id: '5', title: 'Cash Position', value: 0, previousValue: 0, format: 'currency', trend: 'flat', trendIsGood: true, icon: 'Wallet', color: 'teal' },
  { id: '6', title: 'Accounts Receivable', value: 0, previousValue: 0, format: 'currency', trend: 'flat', trendIsGood: false, icon: 'FileText', color: 'amber' },
];

export const mockInsights: AIInsight[] = [
  { id: '1', title: 'Connect QuickBooks', description: 'Connect your QuickBooks account to see revenue, expenses, and AI insights here.', urgency: 'info', category: 'Setup', createdAt: new Date().toISOString() },
];

export const monthlyChartData: ChartDataPoint[] = [
  { month: 'Jan', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Feb', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Mar', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Apr', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'May', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Jun', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Jul', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Aug', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Sep', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Oct', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Nov', revenue: 0, expenses: 0, profit: 0, cash: 0 },
  { month: 'Dec', revenue: 0, expenses: 0, profit: 0, cash: 0 },
];
