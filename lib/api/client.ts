/**
 * Browser API client for v-1 backend (same-origin).
 * Used by the dashboard UI to fetch clients, reports, and trigger sync.
 */

export type ReportRange = '3m' | '6m' | '12m' | '4q';
export type PeriodType = 'month' | 'quarter';

/** Raw client from GET /api/clients?list=1 */
export interface ApiClient {
  client_id: string;
  client_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  last_sync?: string | null;
  client_qbo_connections?: Array<{
    company_id: string;
    customer_id: string | null;
    sync_enabled: boolean;
    status: string;
    connected_at?: string | null;
  }>;
}

/** UI-facing client shape (matches finance-dashboard Client) */
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

/** Derive best qbStatus from all connections (connected > expired > error > disconnected). */
function deriveQbStatus(connections: ApiClient['client_qbo_connections']): Client['qbStatus'] {
  if (!connections?.length) return 'disconnected';
  const statuses = new Set(connections.map((c) => (c.status ?? '').toLowerCase()));
  if (statuses.has('connected') || statuses.has('active')) return 'connected';
  if (statuses.has('expired') || statuses.has('needs_reauth')) return 'expired';
  if (statuses.has('error')) return 'error';
  return 'disconnected';
}

/** Map API client to UI Client */
export function mapApiClientToClient(api: ApiClient): Client {
  const qbStatus = deriveQbStatus(api.client_qbo_connections);
  return {
    id: api.client_id,
    name: api.client_name,
    email: api.email,
    companyName: api.company_name ?? api.client_name,
    industry: '',
    phone: api.phone ?? '',
    status: api.is_active ? 'active' : 'inactive',
    qbStatus,
    lastSync: api.last_sync ?? '',
    createdAt: '',
    notes: api.notes ?? undefined,
  };
}

export async function getClients(): Promise<ApiClient[]> {
  const res = await fetch('/api/clients?list=1');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to fetch clients: ${res.status}`);
  }
  return res.json();
}

export interface ReportsResponse {
  periods: Array<{ id: string; period_type: string; start_date: string; end_date: string; label: string }>;
  reports: Array<{
    id: string;
    report_type: string;
    period_id: string;
    raw_json: unknown;
    synced_at: string;
    period?: { id: string; label: string; start_date?: string; end_date?: string };
  }>;
  range: string;
  periodType: string;
}

export async function getReports(
  clientId: string,
  range: ReportRange = '12m',
  periodType: PeriodType = 'month'
): Promise<ReportsResponse> {
  const params = new URLSearchParams({ clientId, range, periodType });
  const res = await fetch(`/api/quickbooks/reports?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to fetch reports: ${res.status}`);
  }
  return res.json();
}

/** Error with optional code from API (e.g. no_connection, needs_reauth). */
export class SyncError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export async function syncReports(
  clientId: string,
  range: ReportRange = '12m',
  periodType: PeriodType = 'month'
): Promise<{ ok: boolean; reportsSaved?: number; errors?: string[] }> {
  const res = await fetch('/api/quickbooks/reports/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, range, periodType }),
  });
  const data = await res.json().catch(() => ({})) as {
    error?: string;
    code?: string;
    ok?: boolean;
    reportsSaved?: number;
    errors?: string[];
  };
  if (!res.ok) {
    throw new SyncError(data.error ?? `Sync failed: ${res.status}`, data.code);
  }
  if (data.ok && data.reportsSaved === 0 && data.errors?.length) {
    throw new SyncError(
      data.errors[0] ?? 'No reports were synced from QuickBooks.',
      'sync_failed'
    );
  }
  return data as { ok: boolean; reportsSaved?: number; errors?: string[] };
}

export interface DashboardDataResponse {
  summary: {
    revenue: number;
    expenses: number;
    net_income: number;
    profit_margin_pct: number;
    cash: number;
    accounts_receivable: number;
    accounts_payable: number;
  };
  previousSummary: {
    revenue: number;
    expenses: number;
    net_income: number;
    profit_margin_pct: number;
    cash: number;
    accounts_receivable: number;
    accounts_payable: number;
  };
  period: { id: string; label: string; start_date: string; end_date: string } | null;
  trends: Array<{
    periodLabel: string;
    start_date: string;
    end_date: string;
    revenue: number;
    expenses: number;
    profit: number;
    cash: number;
  }>;
  range: string;
}

export async function getDashboardData(
  clientId: string,
  range: ReportRange = '12m'
): Promise<DashboardDataResponse> {
  const params = new URLSearchParams({ clientId, range });
  const res = await fetch(`/api/dashboard/data?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to load dashboard: ${res.status}`);
  }
  return res.json();
}

/** AI insight shape (matches API and lib/financialData AIInsight) */
export interface AIInsightResponse {
  id: string;
  title: string;
  description: string;
  urgency: 'action_required' | 'watch' | 'positive' | 'info';
  category: string;
  metric?: string;
  metricValue?: string;
  createdAt: string;
}

export async function getInsights(
  clientId: string,
  range: ReportRange = '12m'
): Promise<{ insights: AIInsightResponse[] }> {
  const params = new URLSearchParams({ clientId, range });
  const res = await fetch(`/api/insights?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to load insights: ${res.status}`);
  }
  return res.json();
}

export async function generateInsights(
  clientId: string,
  range: ReportRange = '12m'
): Promise<{ insights: AIInsightResponse[] }> {
  const res = await fetch('/api/insights/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, range }),
  });
  const data = await res.json().catch(() => ({})) as { error?: string; insights?: AIInsightResponse[] };
  if (!res.ok) throw new Error(data.error ?? `Generate insights failed: ${res.status}`);
  return { insights: data.insights ?? [] };
}
