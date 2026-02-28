'use client';

import React, { useState, useEffect } from 'react';
import AdminAuth from '@/app/components/AdminAuth';
import SignOutButton from '@/app/components/SignOutButton';
import { 
  Users, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Building,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  Receipt,
  CreditCard,
  Package,
  PieChart,
  BarChart3,
  Download,
  Plus,
  Edit,
  Briefcase,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Settings,
  FileSpreadsheet,
  StickyNote,
  Link,
  Upload,
  Folder,
  File,
  Image,
  Trash2,
  Eye,
  Search,
  Bell,
  AlertTriangle,
  Zap,
  Banknote,
  Wallet,
  ArrowRightLeft,
  Shield,
  Info,
  Building2,
  Truck,
  HardDrive,
  Award,
  TrendingDown as DepreciationIcon,
  DollarSign as ValueIcon,
  Save,
  X,
  Edit2
} from 'lucide-react';

interface Client {
  client_id: string;
  client_name: string;
  company_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  tags: string[];
  notes?: string;
  client_qbo_connections?: {
    company_id: string;
    customer_id: string;
    sync_enabled: boolean;
    status: string;
  }[];
}

interface Asset {
  id: string;
  name: string;
  category: 'fixed' | 'intangible' | 'investment' | 'inventory' | 'lease';
  subcategory: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciationMethod: 'straight-line' | 'declining' | 'units' | 'none';
  usefulLife: number; // in years
  salvageValue: number;
  location?: string;
  serialNumber?: string;
  vendor?: string;
  warranty?: string;
  status: 'active' | 'disposed' | 'impaired' | 'under-maintenance';
  notes?: string;
}

interface QuickBooksData {
  customer: {
    id: string;
    name: string;
    balance: number;
    email?: string;
    phone?: string;
    active: boolean;
  };
  invoices: {
    total: number;
    totalAmount: number;
    overdueAmount: number;
    recentInvoices: Array<{
      id: string;
      amount: number;
      balance: number;
      dueDate: string;
      date: string;
    }>;
  };
  payments: {
    lastPaymentDate: string | null;
    lastPaymentAmount: number;
  };
  expenses?: {
    total: number;
    totalAmount: number;
    categories: { [key: string]: number };
  };
  profitLoss?: {
    revenue: number;
    expenses: number;
    netIncome: number;
  };
  status: string;
}

interface TreasuryData {
  totalCash: number;
  accountBalances: Array<{
    bank: string;
    accountName: string;
    balance: number;
    available: number;
    currency: string;
  }>;
  cashFlow: {
    inflows: number;
    outflows: number;
    net: number;
  };
  creditLines: Array<{
    lender: string;
    limit: number;
    used: number;
    available: number;
    rate: number;
  }>;
  upcomingTransactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'inflow' | 'outflow';
  }>;
}

interface AnalyticsData {
  kpis: {
    grossMargin: number;
    netMargin: number;
    currentRatio: number;
    quickRatio: number;
    dso: number;
    dpo: number;
    burnRate: number;
    runway: number;
  };
  trends: {
    revenue: Array<{ month: string; value: number }>;
    expenses: Array<{ month: string; value: number }>;
  };
  budgetVariance: {
    revenue: { actual: number; budget: number; variance: number };
    expenses: { actual: number; budget: number; variance: number };
  };
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  actionRequired: boolean;
  timestamp: string;
}

type TimeFrame = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'all';
type ViewType = 'overview' | 'treasury' | 'assets' | 'transactions' | 'analytics' | 'reports' | 'documents' | 'alerts' | 'integrations' | 'notes';

export default function CFOClientDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <AdminAuth>
      <DashboardContent 
        clients={clients}
        setClients={setClients}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        loading={loading}
        setLoading={setLoading}
      />
    </AdminAuth>
  );
}

function DashboardContent({
  clients,
  setClients,
  selectedClient,
  setSelectedClient,
  loading,
  setLoading
}: {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  selectedClient: Client | null;
  setSelectedClient: React.Dispatch<React.SetStateAction<Client | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [qbData, setQbData] = useState<QuickBooksData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('30d');
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectBanner, setShowConnectBanner] = useState(false);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: string;
    lastSyncAt: string | null;
    expirationTime: string | null;
    lastError?: string;
  } | null>(null);

  const [reportsRange, setReportsRange] = useState<'3m' | '6m' | '12m' | '4q'>('3m');
  const [reportsPeriodType, setReportsPeriodType] = useState<'month' | 'quarter'>('month');
  const [reportsData, setReportsData] = useState<{
    periods: Array<{ id: string; label: string; start_date: string; end_date: string }>;
    reports: Array<{ report_type: string; period_id: string; period?: { label: string }; raw_json: unknown; synced_at: string }>;
  } | null>(null);
  const [reportsSyncLoading, setReportsSyncLoading] = useState(false);
  const [reportsLoadError, setReportsLoadError] = useState<string | null>(null);
  const [reportsSyncResult, setReportsSyncResult] = useState<{ reportsSaved: number; errors: string[] } | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'balance_sheet' | 'cash_flow' | 'ar_aging' | 'ap_aging' | 'coa'>('pnl');
  const [qbDisconnecting, setQbDisconnecting] = useState(false);

  // Assets state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetFormData, setAssetFormData] = useState<Partial<Asset>>({
    category: 'fixed',
    depreciationMethod: 'straight-line',
    status: 'active',
    usefulLife: 5,
    salvageValue: 0
  });

  // Mock CFO data - replace with real API calls
  const [treasuryData] = useState<TreasuryData>({
    totalCash: 2847500,
    accountBalances: [
      { bank: 'Chase', accountName: 'Operating', balance: 1250000, available: 1200000, currency: 'USD' },
      { bank: 'Wells Fargo', accountName: 'Payroll', balance: 450000, available: 450000, currency: 'USD' },
      { bank: 'Bank of America', accountName: 'Savings', balance: 1147500, available: 1147500, currency: 'USD' }
    ],
    cashFlow: {
      inflows: 520000,
      outflows: 380000,
      net: 140000
    },
    creditLines: [
      { lender: 'Chase', limit: 500000, used: 150000, available: 350000, rate: 7.5 },
      { lender: 'Wells Fargo', limit: 250000, used: 0, available: 250000, rate: 8.0 }
    ],
    upcomingTransactions: [
      { date: '2024-11-15', description: 'Client Payment - Invoice #1234', amount: 85000, type: 'inflow' },
      { date: '2024-11-16', description: 'Payroll', amount: 125000, type: 'outflow' },
      { date: '2024-11-18', description: 'Vendor Payment - Supplies', amount: 32000, type: 'outflow' },
      { date: '2024-11-20', description: 'Client Payment - Invoice #1235', amount: 95000, type: 'inflow' }
    ]
  });

  const [analyticsData] = useState<AnalyticsData>({
    kpis: {
      grossMargin: 42.5,
      netMargin: 18.3,
      currentRatio: 2.1,
      quickRatio: 1.8,
      dso: 45,
      dpo: 30,
      burnRate: 280000,
      runway: 10.2
    },
    trends: {
      revenue: [
        { month: 'Jul', value: 420000 },
        { month: 'Aug', value: 485000 },
        { month: 'Sep', value: 520000 },
        { month: 'Oct', value: 510000 },
        { month: 'Nov', value: 495000 }
      ],
      expenses: [
        { month: 'Jul', value: 350000 },
        { month: 'Aug', value: 380000 },
        { month: 'Sep', value: 365000 },
        { month: 'Oct', value: 390000 },
        { month: 'Nov', value: 380000 }
      ]
    },
    budgetVariance: {
      revenue: { actual: 2430000, budget: 2500000, variance: -2.8 },
      expenses: { actual: 1865000, budget: 1800000, variance: 3.6 }
    }
  });

  const [alerts] = useState<Alert[]>([
    {
      id: '1',
      severity: 'critical',
      category: 'Cash Flow',
      title: 'Low Cash Alert',
      description: 'Projected cash balance will fall below minimum threshold in 5 days',
      actionRequired: true,
      timestamp: '2024-11-14T10:30:00'
    },
    {
      id: '2',
      severity: 'warning',
      category: 'Collections',
      title: 'Large Invoice Overdue',
      description: 'Invoice #1230 ($125,000) is 15 days overdue',
      actionRequired: true,
      timestamp: '2024-11-14T09:15:00'
    },
    {
      id: '3',
      severity: 'info',
      category: 'Banking',
      title: 'Wire Transfer Completed',
      description: 'Wire transfer of $50,000 to vendor completed successfully',
      actionRequired: false,
      timestamp: '2024-11-14T08:00:00'
    }
  ]);

  // Mock assets data
  useEffect(() => {
    setAssets([
      {
        id: '1',
        name: 'Dell PowerEdge R740 Server',
        category: 'fixed',
        subcategory: 'IT Equipment',
        purchaseDate: '2023-01-15',
        purchasePrice: 25000,
        currentValue: 18750,
        depreciationMethod: 'straight-line',
        usefulLife: 5,
        salvageValue: 2500,
        location: 'Data Center - Rack A12',
        serialNumber: 'DLL-2023-R740-001',
        vendor: 'Dell Technologies',
        warranty: '2026-01-15',
        status: 'active',
        notes: 'Primary database server'
      },
      {
        id: '2',
        name: 'Office Building - 123 Main St',
        category: 'fixed',
        subcategory: 'Real Estate',
        purchaseDate: '2020-06-01',
        purchasePrice: 1250000,
        currentValue: 1350000,
        depreciationMethod: 'straight-line',
        usefulLife: 30,
        salvageValue: 250000,
        location: '123 Main St, Suite 100',
        status: 'active',
        notes: 'Corporate headquarters'
      },
      {
        id: '3',
        name: 'Customer Database Software License',
        category: 'intangible',
        subcategory: 'Software',
        purchaseDate: '2022-03-01',
        purchasePrice: 50000,
        currentValue: 30000,
        depreciationMethod: 'straight-line',
        usefulLife: 3,
        salvageValue: 0,
        vendor: 'Salesforce',
        status: 'active'
      },
      {
        id: '4',
        name: 'Company Van - Ford Transit',
        category: 'fixed',
        subcategory: 'Vehicles',
        purchaseDate: '2022-09-15',
        purchasePrice: 45000,
        currentValue: 32000,
        depreciationMethod: 'declining',
        usefulLife: 5,
        salvageValue: 5000,
        location: 'Company Parking',
        serialNumber: 'VIN-1FTBW2XG7NFA12345',
        status: 'active'
      }
    ]);
  }, []);

  useEffect(() => {
    fetchClients();
    
    // Check for OAuth callback parameters and connect prompt
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');
    const connectQbo = urlParams.get('connect') === 'qbo';
    
    if (connectQbo) {
      setShowConnectBanner(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (connected === 'true') {
      // Refresh clients to show updated connection status
      setTimeout(() => {
        fetchClients();
      }, 500);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'connection_failed') {
      console.error('QuickBooks connection failed');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientData(selectedClient);
      setNotes(selectedClient.notes || '');
    } else {
      setConnectionStatus(null);
    }
  }, [selectedClient, timeFrame]);

  useEffect(() => {
    if (activeView === 'reports' && selectedClient) fetchReports();
  }, [activeView, selectedClient?.client_id, reportsRange, reportsPeriodType]);

  const fetchClients = async (): Promise<Client[]> => {
    try {
      setConfigError(null);
      const res = await fetch('/api/clients?list=1');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Failed to fetch clients (${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setClients(list);
      if (list.length > 0) {
        setSelectedClient(list[0]);
      }
      return list;
    } catch (error) {
      console.error('Error fetching clients:', error);
      setConfigError(error instanceof Error ? error.message : 'Failed to fetch clients');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async (clientId: string) => {
    try {
      const res = await fetch(`/api/quickbooks/connection?clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data);
      } else {
        setConnectionStatus({ status: 'error', lastSyncAt: null, expirationTime: null });
      }
    } catch {
      setConnectionStatus({ status: 'error', lastSyncAt: null, expirationTime: null });
    }
  };

  const fetchClientData = async (client: Client) => {
    fetchConnectionStatus(client.client_id);

    if (!client.client_qbo_connections?.[0]) {
      setQbData({
        customer: {
          id: client.client_id,
          name: client.client_name,
          balance: 0,
          email: client.email,
          active: client.is_active
        },
        invoices: { total: 0, totalAmount: 0, overdueAmount: 0, recentInvoices: [] },
        payments: { lastPaymentDate: null, lastPaymentAmount: 0 },
        status: 'not_connected'
      });
      return;
    }

    setRefreshing(true);
    const connection = client.client_qbo_connections[0];
    const params = new URLSearchParams({ clientId: client.client_id });
    if (connection.customer_id) params.set('customerId', connection.customer_id);
    if (connection.company_id) params.set('companyId', connection.company_id);
    if (timeFrame) params.set('timeFrame', timeFrame);

    try {
      const response = await fetch(`/api/quickbooks/customer?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setQbData(data);
      }
    } catch (error) {
      console.error('Error fetching QB data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedClient) return;
    
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selectedClient.client_id, notes }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to save notes');
      }
      setEditingNotes(false);
      setSelectedClient({ ...selectedClient, notes });
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  // QuickBooks connection handler
  const connectQBFromDashboard = (clientId: string) => {
    // Pass the client_id and returnTo parameter for OAuth flow
    window.location.href = `/api/quickbooks/auth?clientId=${clientId}&returnTo=dashboard`;
  };

  const disconnectQBFromDashboard = async () => {
    if (!selectedClient) return;
    const prevClientId = selectedClient.client_id;
    setQbDisconnecting(true);
    try {
      const res = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: prevClientId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to disconnect');
      }
      await fetchConnectionStatus(prevClientId);
      const list = await fetchClients();
      const next = list.find((c) => c.client_id === prevClientId) ?? list[0];
      if (next) setSelectedClient(next);
    } catch (e) {
      console.error('Disconnect failed:', e);
      setConfigError(e instanceof Error ? e.message : 'Failed to disconnect QuickBooks');
    } finally {
      setQbDisconnecting(false);
    }
  };

  const fetchReports = async () => {
    if (!selectedClient) return;
    setReportsLoadError(null);
    try {
      const res = await fetch(
        `/api/quickbooks/reports?clientId=${encodeURIComponent(selectedClient.client_id)}&range=${reportsRange}&periodType=${reportsPeriodType}`
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to load reports (${res.status})`);
      }
      const data = await res.json();
      setReportsData({ periods: data.periods || [], reports: data.reports || [] });
    } catch (e) {
      setReportsLoadError(e instanceof Error ? e.message : 'Failed to load reports');
      setReportsData(null);
    }
  };

  const syncReports = async () => {
    if (!selectedClient) return;
    setReportsSyncLoading(true);
    setReportsLoadError(null);
    setReportsSyncResult(null);
    try {
      const res = await fetch('/api/quickbooks/reports/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.client_id,
          range: reportsRange,
          periodType: reportsPeriodType,
          includeOptional: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setReportsSyncResult({
        reportsSaved: data.reportsSaved ?? 0,
        errors: data.errors ?? [],
      });
      await fetchReports();
    } catch (e) {
      setReportsLoadError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setReportsSyncLoading(false);
    }
  };

  // Asset management functions
  const calculateDepreciation = (asset: Asset): number => {
    const age = (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (asset.depreciationMethod === 'straight-line') {
      const annualDepreciation = (asset.purchasePrice - asset.salvageValue) / asset.usefulLife;
      const totalDepreciation = Math.min(annualDepreciation * age, asset.purchasePrice - asset.salvageValue);
      return asset.purchasePrice - totalDepreciation;
    } else if (asset.depreciationMethod === 'declining') {
      const rate = 2 / asset.usefulLife;
      let value = asset.purchasePrice;
      for (let i = 0; i < Math.floor(age); i++) {
        value = value * (1 - rate);
      }
      return Math.max(value, asset.salvageValue);
    }
    
    return asset.currentValue;
  };

  const saveAsset = () => {
    const newAsset: Asset = {
      id: editingAsset?.id || Date.now().toString(),
      name: assetFormData.name || '',
      category: assetFormData.category || 'fixed',
      subcategory: assetFormData.subcategory || '',
      purchaseDate: assetFormData.purchaseDate || '',
      purchasePrice: assetFormData.purchasePrice || 0,
      currentValue: assetFormData.currentValue || assetFormData.purchasePrice || 0,
      depreciationMethod: assetFormData.depreciationMethod || 'straight-line',
      usefulLife: assetFormData.usefulLife || 5,
      salvageValue: assetFormData.salvageValue || 0,
      location: assetFormData.location,
      serialNumber: assetFormData.serialNumber,
      vendor: assetFormData.vendor,
      warranty: assetFormData.warranty,
      status: assetFormData.status || 'active',
      notes: assetFormData.notes
    };

    if (editingAsset) {
      setAssets(assets.map(a => a.id === editingAsset.id ? newAsset : a));
    } else {
      setAssets([...assets, newAsset]);
    }

    setShowAssetModal(false);
    setEditingAsset(null);
    setAssetFormData({
      category: 'fixed',
      depreciationMethod: 'straight-line',
      status: 'active',
      usefulLife: 5,
      salvageValue: 0
    });
  };

  const deleteAsset = (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  /** Parse a raw string value to formatted currency, or return as-is. */
  const formatReportValue = (raw: string | undefined): string => {
    if (!raw || raw === '' || raw === '-') return raw || '—';
    const num = parseFloat(String(raw).replace(/[$,]/g, ''));
    if (!Number.isNaN(num)) return formatCurrency(num);
    return raw;
  };

  /** From ColData array, pick the cell that looks like a number so the Total column never shows a label. */
  const pickNumericColValue = (colData: Array<{ value?: string }> | undefined): string => {
    if (!colData?.length) return '';
    for (const col of colData) {
      const v = col.value?.trim();
      if (!v || v === '-') continue;
      const num = parseFloat(String(v).replace(/[$,]/g, ''));
      if (!Number.isNaN(num)) return v;
    }
    return colData[colData.length - 1]?.value ?? colData[0]?.value ?? '';
  };

  type FlatReportRow = { account: string; value: string; depth: number; isBold: boolean };

  /** Recursively flatten QuickBooks report JSON into a displayable list. */
  const flattenReportRows = (rows: unknown, depth = 0): FlatReportRow[] => {
    const result: FlatReportRow[] = [];
    const rowsObj = rows as { Row?: unknown[] } | undefined;
    if (!rowsObj?.Row || !Array.isArray(rowsObj.Row)) return result;

    for (const row of rowsObj.Row) {
      const r = row as Record<string, unknown>;

      const headerCols = (r.Header as { ColData?: Array<{ value?: string }> } | undefined)?.ColData;
      const groupName = (r.group as string) ?? headerCols?.[0]?.value ?? '';
      const hasNestedRows = r.Rows && typeof r.Rows === 'object';

      if (hasNestedRows) {
        if (groupName) {
          result.push({ account: groupName, value: '', depth, isBold: true });
        }
        const nested = flattenReportRows(r.Rows, depth + (groupName ? 1 : 0));
        result.push(...nested);

        const summaryCols = (r.Summary as { ColData?: Array<{ value?: string }> } | undefined)?.ColData;
        if (summaryCols?.length) {
          const label = summaryCols[0]?.value ?? `Total ${groupName}`;
          const val = pickNumericColValue(summaryCols) || (summaryCols[summaryCols.length - 1]?.value ?? '');
          result.push({ account: label, value: formatReportValue(val), depth, isBold: true });
        }
      } else if (r.type === 'Data' && Array.isArray(r.ColData)) {
        const cols = r.ColData as Array<{ value?: string }>;
        const label = cols[0]?.value ?? '';
        const val = pickNumericColValue(cols) || (cols[cols.length - 1]?.value ?? '');
        result.push({ account: label, value: formatReportValue(val), depth, isBold: false });
      } else if (groupName) {
        const summaryCols = Array.isArray(r.Summary)
          ? (r.Summary as Array<{ ColData?: Array<{ value?: string }> }>)[0]?.ColData
          : (r.Summary as { ColData?: Array<{ value?: string }> } | undefined)?.ColData;
        const val = pickNumericColValue(summaryCols ?? []) || (summaryCols?.length ? summaryCols[summaryCols.length - 1]?.value ?? '' : '');
        result.push({ account: groupName, value: formatReportValue(val), depth, isBold: true });
      }
    }
    return result;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getAssetIcon = (category: string) => {
    switch (category) {
      case 'fixed': return <Building2 className="w-5 h-5" />;
      case 'intangible': return <Award className="w-5 h-5" />;
      case 'investment': return <TrendingUp className="w-5 h-5" />;
      case 'inventory': return <Package className="w-5 h-5" />;
      case 'lease': return <FileText className="w-5 h-5" />;
      default: return <HardDrive className="w-5 h-5" />;
    }
  };

  const getAssetCategoryColor = (category: string) => {
    switch (category) {
      case 'fixed': return 'bg-blue-100 text-blue-700';
      case 'intangible': return 'bg-purple-100 text-purple-700';
      case 'investment': return 'bg-green-100 text-green-700';
      case 'inventory': return 'bg-orange-100 text-orange-700';
      case 'lease': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const timeFrameOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '12m', label: 'Last 12 Months' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'all', label: 'All Time' }
  ];

  const viewOptions = [
    { value: 'overview', label: 'Overview', icon: PieChart },
    { value: 'treasury', label: 'Treasury', icon: Banknote },
    { value: 'assets', label: 'Assets', icon: Building2 },
    { value: 'transactions', label: 'AP/AR', icon: ArrowRightLeft },
    { value: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { value: 'reports', label: 'Financial Reports', icon: FileSpreadsheet },
    { value: 'alerts', label: 'Alerts', icon: Bell },
    { value: 'documents', label: 'Documents', icon: Folder },
    { value: 'integrations', label: 'Integrations', icon: Link },
    { value: 'notes', label: 'Notes & Tasks', icon: StickyNote }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Could not load clients</h2>
              <p className="text-sm text-gray-700 mb-4">{configError}</p>
              <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">
                <p className="mb-1">Ensure your server has these in .env.local:</p>
                <ul className="list-disc list-inside space-y-1 font-mono">
                  <li>NEXT_PUBLIC_SUPABASE_URL</li>
                  <li>SUPABASE_SERVICE_ROLE_KEY</li>
                </ul>
                <p className="mt-2 text-gray-500">Restart the dev server after changing .env.local.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate asset totals
  const assetTotals = {
    totalOriginalValue: assets.reduce((sum, a) => sum + a.purchasePrice, 0),
    totalCurrentValue: assets.reduce((sum, a) => sum + calculateDepreciation(a), 0),
    totalDepreciation: 0,
    byCategory: {
      fixed: assets.filter(a => a.category === 'fixed').reduce((sum, a) => sum + calculateDepreciation(a), 0),
      intangible: assets.filter(a => a.category === 'intangible').reduce((sum, a) => sum + calculateDepreciation(a), 0),
      investment: assets.filter(a => a.category === 'investment').reduce((sum, a) => sum + calculateDepreciation(a), 0),
      inventory: assets.filter(a => a.category === 'inventory').reduce((sum, a) => sum + calculateDepreciation(a), 0),
      lease: assets.filter(a => a.category === 'lease').reduce((sum, a) => sum + calculateDepreciation(a), 0)
    }
  };
  assetTotals.totalDepreciation = assetTotals.totalOriginalValue - assetTotals.totalCurrentValue;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Client Selector */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Client Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[250px]"
                >
                  <Building className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">
                    {selectedClient ? selectedClient.client_name : 'Select Client'}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </button>
                
                {showDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {clients.map(client => (
                      <button
                        key={client.client_id}
                        onClick={() => {
                          setSelectedClient(client);
                          setShowDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                          selectedClient?.client_id === client.client_id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium">{client.client_name}</div>
                          {client.company_name && (
                            <div className="text-xs text-gray-500">{client.company_name}</div>
                          )}
                        </div>
                        {client.client_qbo_connections && client.client_qbo_connections.length > 0 && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Frame Selector */}
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeFrameOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => selectedClient && fetchClientData(selectedClient)}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Alert Badge */}
              <button className="p-2 text-gray-600 hover:text-gray-900 relative">
                <Bell className="w-5 h-5" />
                {alerts.filter(a => a.severity === 'critical').length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* QuickBooks Link */}
              {selectedClient?.client_qbo_connections?.[0] && (
                <a
                  href={`https://app.qbo.intuit.com/app/customerdetail?nameId=${selectedClient.client_qbo_connections[0].customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Open in QuickBooks
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <SignOutButton />
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {viewOptions.map(view => {
              const Icon = view.icon;
              return (
                <button
                  key={view.value}
                  onClick={() => setActiveView(view.value as ViewType)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap ${
                    activeView === view.value
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* QuickBooks connect prompt (from /connect or ?connect=qbo) */}
      {showConnectBanner && (
        <div className="max-w-7xl mx-auto px-6 pt-2">
          <div className="flex items-center justify-between gap-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <p className="text-sm text-green-800">
              Select a client below, then click <strong>Connect to QuickBooks</strong> in the Overview tab to link their QuickBooks account.
            </p>
            <button
              type="button"
              onClick={() => setShowConnectBanner(false)}
              className="shrink-0 p-1.5 text-green-600 hover:text-green-800 rounded"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedClient && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Overview View */}
          {activeView === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Current Balance</p>
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(qbData?.customer?.balance || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">As of today</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total Invoiced</p>
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(qbData?.invoices?.totalAmount || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{qbData?.invoices?.total || 0} invoices</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total Assets</p>
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(assetTotals.totalCurrentValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{assets.length} assets</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Cash Position</p>
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(treasuryData.totalCash)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Across all accounts</p>
                </div>
              </div>

              {/* Client Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Company</dt>
                      <dd className="text-sm text-gray-900">{selectedClient.company_name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">{selectedClient.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="text-sm text-gray-900">{selectedClient.phone || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Tags</dt>
                      <dd className="flex gap-1 flex-wrap mt-1">
                        {selectedClient.tags?.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {tag}
                          </span>
                        )) || <span className="text-sm text-gray-500">No tags</span>}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">QuickBooks Connection</h3>
                  {connectionStatus === null ? (
                    <p className="text-sm text-gray-500">Loading connection status…</p>
                  ) : connectionStatus.status === 'connected' || connectionStatus.status === 'needs_reauth' || connectionStatus.status === 'error' ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            connectionStatus.status === 'connected' ? 'bg-green-500' :
                            connectionStatus.status === 'needs_reauth' ? 'bg-amber-500' : 'bg-red-500'
                          }`}></span>
                          <span className={`text-sm ${
                            connectionStatus.status === 'connected' ? 'text-green-700' :
                            connectionStatus.status === 'needs_reauth' ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {connectionStatus.status === 'connected' ? 'Connected' :
                             connectionStatus.status === 'needs_reauth' ? 'Needs re-authorization' : 'Error'}
                          </span>
                        </dd>
                      </div>
                      {connectionStatus.lastSyncAt && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Last sync</dt>
                          <dd className="text-sm text-gray-900">
                            {new Date(connectionStatus.lastSyncAt).toLocaleString()}
                          </dd>
                        </div>
                      )}
                      {connectionStatus.expirationTime && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Token expires</dt>
                          <dd className="text-sm text-gray-900">
                            {new Date(connectionStatus.expirationTime).toLocaleString()}
                          </dd>
                        </div>
                      )}
                      {connectionStatus.lastError && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Last error</dt>
                          <dd className="text-sm text-red-600">{connectionStatus.lastError}</dd>
                        </div>
                      )}
                      {selectedClient.client_qbo_connections?.[0] && (
                        <>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Company ID</dt>
                            <dd className="text-sm text-gray-900 font-mono">
                              {selectedClient.client_qbo_connections[0].company_id}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Customer ID</dt>
                            <dd className="text-sm text-gray-900 font-mono">
                              {selectedClient.client_qbo_connections[0].customer_id}
                            </dd>
                          </div>
                        </>
                      )}
                      {(connectionStatus.status === 'needs_reauth' || connectionStatus.status === 'error') && (
                        <div className="pt-2">
                          <button
                            onClick={() => connectQBFromDashboard(selectedClient.client_id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                          >
                            <Link className="w-4 h-4" />
                            Reconnect QuickBooks
                          </button>
                        </div>
                      )}
                      {connectionStatus.status === 'connected' && (
                        <div className="pt-2">
                          <button
                            onClick={disconnectQBFromDashboard}
                            disabled={qbDisconnecting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {qbDisconnecting ? 'Disconnecting…' : 'Disconnect QuickBooks'}
                          </button>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">No QuickBooks connection</p>
                      <button
                        onClick={() => connectQBFromDashboard(selectedClient.client_id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Link className="w-4 h-4" />
                        Connect QuickBooks
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Treasury & Cash View (Merged with Cash Flow) */}
          {activeView === 'treasury' && (
            <div className="space-y-6">
              {/* Cash Position Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total Cash</p>
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(treasuryData.totalCash)}</p>
                  <p className="text-xs text-gray-500 mt-1">Across all accounts</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Available Credit</p>
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(600000)}</p>
                  <p className="text-xs text-gray-500 mt-1">Across 2 credit lines</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                    <ArrowRightLeft className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(treasuryData.cashFlow.net)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">This period</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Days Cash On Hand</p>
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">32</p>
                  <p className="text-xs text-gray-500 mt-1">Based on burn rate</p>
                </div>
              </div>

              {/* Cash Flow Analysis */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Analysis</h3>
                {/* Cash Flow Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-green-900">Inflows</p>
                      <ArrowDownRight className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(520000)}</p>
                    <p className="text-xs text-gray-600">This period</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-red-900">Outflows</p>
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(380000)}</p>
                    <p className="text-xs text-gray-600">This period</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-900">Net Flow</p>
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(140000)}</p>
                    <p className="text-xs text-gray-600">Positive trend</p>
                  </div>
                </div>
                {/* Forecast */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">30-Day Forecast</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Expected ending balance</span>
                      <span className="font-bold text-lg">{formatCurrency(2987500)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Based on historical patterns</p>
                  </div>
                </div>
              </div>

              {/* Bank Accounts */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Bank Accounts</h3>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Connect New Bank →
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {treasuryData.accountBalances.map((account, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Banknote className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{account.bank} - {account.accountName}</p>
                            <p className="text-sm text-gray-500">Available: {formatCurrency(account.available)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(account.balance)}</p>
                          <p className="text-xs text-gray-500">{account.currency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Credit Lines & Upcoming Transactions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Lines</h3>
                  <div className="space-y-4">
                    {treasuryData.creditLines.map((line, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">{line.lender}</span>
                          <span className="text-sm text-gray-500">{line.rate}% APR</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(line.used / line.limit) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Used: {formatCurrency(line.used)}</span>
                          <span>Available: {formatCurrency(line.available)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Transactions</h3>
                  <div className="space-y-3">
                    {treasuryData.upcomingTransactions.map((transaction, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          {transaction.type === 'inflow' ? (
                            <ArrowDownRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                          </div>
                        </div>
                        <span className={`font-medium ${
                          transaction.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'inflow' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assets View */}
          {activeView === 'assets' && (
            <div className="space-y-6">
              {/* Asset Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total Assets</p>
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(assetTotals.totalCurrentValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Current value</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Original Cost</p>
                    <ValueIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(assetTotals.totalOriginalValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Purchase price</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Depreciation</p>
                    <DepreciationIcon className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(assetTotals.totalDepreciation)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Accumulated</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Active Assets</p>
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {assets.filter(a => a.status === 'active').length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    of {assets.length} total
                  </p>
                </div>
              </div>

              {/* Asset Categories Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries({
                    fixed: 'Fixed Assets',
                    intangible: 'Intangible',
                    investment: 'Investments',
                    inventory: 'Inventory',
                    lease: 'Leases'
                  }).map(([key, label]) => (
                    <div key={key} className="text-center">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-2 ${
                        key === 'fixed' ? 'bg-blue-100' :
                        key === 'intangible' ? 'bg-purple-100' :
                        key === 'investment' ? 'bg-green-100' :
                        key === 'inventory' ? 'bg-orange-100' :
                        'bg-pink-100'
                      }`}>
                        {getAssetIcon(key)}
                      </div>
                      <p className="text-xs font-medium text-gray-600">{label}</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(assetTotals.byCategory[key as keyof typeof assetTotals.byCategory])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asset List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Asset Register</h3>
                  <button
                    onClick={() => {
                      setEditingAsset(null);
                      setAssetFormData({
                        category: 'fixed',
                        depreciationMethod: 'straight-line',
                        status: 'active',
                        usefulLife: 5,
                        salvageValue: 0
                      });
                      setShowAssetModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Asset
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Asset
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchase Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Original Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {assets.map(asset => (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                                asset.category === 'fixed' ? 'bg-blue-100' :
                                asset.category === 'intangible' ? 'bg-purple-100' :
                                asset.category === 'investment' ? 'bg-green-100' :
                                asset.category === 'inventory' ? 'bg-orange-100' :
                                'bg-pink-100'
                              }`}>
                                {getAssetIcon(asset.category)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                                <p className="text-xs text-gray-500">{asset.subcategory}</p>
                                {asset.location && (
                                  <p className="text-xs text-gray-400">{asset.location}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded ${getAssetCategoryColor(asset.category)}`}>
                              {asset.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(asset.purchaseDate)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatCurrency(asset.purchasePrice)}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(calculateDepreciation(asset))}
                              </p>
                              {asset.depreciationMethod !== 'none' && (
                                <p className="text-xs text-gray-500">
                                  {Math.round(((asset.purchasePrice - calculateDepreciation(asset)) / asset.purchasePrice) * 100)}% depreciated
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded ${
                              asset.status === 'active' ? 'bg-green-100 text-green-700' :
                              asset.status === 'disposed' ? 'bg-gray-100 text-gray-700' :
                              asset.status === 'impaired' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingAsset(asset);
                                  setAssetFormData(asset);
                                  setShowAssetModal(true);
                                }}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteAsset(asset.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Depreciation Schedule */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Depreciation Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">By Method</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Straight-line</span>
                        <span className="font-medium">{assets.filter(a => a.depreciationMethod === 'straight-line').length} assets</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Declining balance</span>
                        <span className="font-medium">{assets.filter(a => a.depreciationMethod === 'declining').length} assets</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">No depreciation</span>
                        <span className="font-medium">{assets.filter(a => a.depreciationMethod === 'none').length} assets</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Annual Depreciation</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(assetTotals.totalDepreciation / 3)}</p>
                    <p className="text-xs text-gray-500">Estimated yearly</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Book Value Ratio</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round((assetTotals.totalCurrentValue / assetTotals.totalOriginalValue) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">Of original value</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions View (Merged Invoices & Expenses) */}
          {activeView === 'transactions' && (
            <div className="space-y-6">
              {/* Transaction Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Receivables</p>
                    <ArrowDownRight className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(qbData?.invoices?.totalAmount || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Outstanding</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Payables</p>
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(245000)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">To vendors</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Overdue</p>
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(qbData?.invoices?.overdueAmount || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Needs attention</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Net Position</p>
                    <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency((qbData?.invoices?.totalAmount || 0) - 245000)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">AR - AP</p>
                </div>
              </div>

              {/* Accounts Receivable */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Accounts Receivable</h3>
                <div className="space-y-4">
                  {/* Invoice Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Open Invoices</p>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Paid This Month</p>
                      <p className="text-2xl font-bold text-green-600">8</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">3</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Avg Days to Pay</p>
                      <p className="text-2xl font-bold text-gray-900">28</p>
                    </div>
                  </div>
                  
                  {/* Recent Invoices */}
                  {qbData?.invoices?.recentInvoices && qbData.invoices.recentInvoices.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {qbData?.invoices?.recentInvoices?.map(invoice => (
                            <tr key={invoice.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">#{invoice.id}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{formatDate(invoice.date)}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(invoice.amount)}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(invoice.balance)}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  invoice.balance === 0 
                                    ? 'bg-green-100 text-green-700' 
                                    : invoice.balance === invoice.amount 
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {invoice.balance === 0 ? 'Paid' : invoice.balance === invoice.amount ? 'Unpaid' : 'Partial'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Accounts Payable / Expenses */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Accounts Payable & Expenses</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(380000)}</p>
                    <p className="text-xs text-gray-500">This period</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Largest Category</p>
                    <p className="text-2xl font-bold text-gray-900">Payroll</p>
                    <p className="text-xs text-gray-500">45% of total</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">vs Last Period</p>
                    <p className="text-2xl font-bold text-green-600">-8.2%</p>
                    <p className="text-xs text-gray-500">Good trend</p>
                  </div>
                </div>
                
                {/* Expense Categories */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Payroll & Benefits</p>
                        <p className="text-sm text-gray-500">45% of expenses</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(171000)}</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Office & Facilities</p>
                        <p className="text-sm text-gray-500">20% of expenses</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(76000)}</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Software & Tools</p>
                        <p className="text-sm text-gray-500">15% of expenses</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(57000)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics & Reports View (Merged) */}
          {activeView === 'analytics' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Gross Margin</p>
                  <p className="text-xl font-bold text-gray-900">{formatPercent(analyticsData.kpis.grossMargin)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">+2.3%</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Net Margin</p>
                  <p className="text-xl font-bold text-gray-900">{formatPercent(analyticsData.kpis.netMargin)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowDownRight className="w-3 h-3 text-red-600" />
                    <span className="text-xs text-red-600">-0.8%</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Current Ratio</p>
                  <p className="text-xl font-bold text-gray-900">{analyticsData.kpis.currentRatio.toFixed(1)}</p>
                  <span className="text-xs text-gray-500">Healthy</span>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Quick Ratio</p>
                  <p className="text-xl font-bold text-gray-900">{analyticsData.kpis.quickRatio.toFixed(1)}</p>
                  <span className="text-xs text-gray-500">Strong</span>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Days Sales Outstanding</p>
                  <p className="text-xl font-bold text-gray-900">{analyticsData.kpis.dso} days</p>
                  <span className="text-xs text-yellow-600">Needs improvement</span>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Days Payable Outstanding</p>
                  <p className="text-xl font-bold text-gray-900">{analyticsData.kpis.dpo} days</p>
                  <span className="text-xs text-green-600">Optimal</span>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Monthly Burn Rate</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(analyticsData.kpis.burnRate)}</p>
                  <span className="text-xs text-gray-500">Avg last 3 months</span>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Runway</p>
                  <p className="text-xl font-bold text-gray-900">{analyticsData.kpis.runway.toFixed(1)} mo</p>
                  <span className="text-xs text-gray-500">At current burn</span>
                </div>
              </div>

              {/* Charts and Variance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses Trend</h3>
                  <div className="h-64 flex items-end justify-between gap-4">
                    {analyticsData.trends.revenue.map((item, idx) => (
                      <div key={idx} className="flex-1 space-y-2">
                        <div className="relative h-48 flex flex-col justify-end gap-1">
                          <div 
                            className="bg-green-500 rounded-t"
                            style={{ height: `${(item.value / 600000) * 100}%` }}
                          />
                          <div 
                            className="bg-red-500 rounded-b"
                            style={{ height: `${(analyticsData.trends.expenses[idx].value / 600000) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-center text-gray-600">{item.month}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm text-gray-600">Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-sm text-gray-600">Expenses</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual (YTD)</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Revenue</span>
                        <span className={`text-sm font-medium ${
                          analyticsData.budgetVariance.revenue.variance < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {analyticsData.budgetVariance.revenue.variance}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Actual: {formatCurrency(analyticsData.budgetVariance.revenue.actual)}</span>
                          <span>Budget: {formatCurrency(analyticsData.budgetVariance.revenue.budget)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(analyticsData.budgetVariance.revenue.actual / analyticsData.budgetVariance.revenue.budget) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Expenses</span>
                        <span className={`text-sm font-medium ${
                          analyticsData.budgetVariance.expenses.variance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          +{analyticsData.budgetVariance.expenses.variance}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Actual: {formatCurrency(analyticsData.budgetVariance.expenses.actual)}</span>
                          <span>Budget: {formatCurrency(analyticsData.budgetVariance.expenses.budget)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(analyticsData.budgetVariance.expenses.actual / analyticsData.budgetVariance.expenses.budget) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Reports */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <FileSpreadsheet className="w-6 h-6 text-blue-600 mb-2" />
                    <h4 className="font-medium">Profit & Loss Statement</h4>
                    <p className="text-sm text-gray-500">Income statement for the period</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <BarChart3 className="w-6 h-6 text-green-600 mb-2" />
                    <h4 className="font-medium">Balance Sheet</h4>
                    <p className="text-sm text-gray-500">Financial position snapshot</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                    <h4 className="font-medium">Cash Flow Statement</h4>
                    <p className="text-sm text-gray-500">Cash movement analysis</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <PieChart className="w-6 h-6 text-orange-600 mb-2" />
                    <h4 className="font-medium">Custom Report Builder</h4>
                    <p className="text-sm text-gray-500">Create custom financial reports</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Financial Reports (QuickBooks) */}
          {activeView === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={reportsRange}
                      onChange={(e) => setReportsRange(e.target.value as '3m' | '6m' | '12m' | '4q')}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="3m">Last 3 months</option>
                      <option value="6m">Last 6 months</option>
                      <option value="12m">Last 12 months</option>
                      <option value="4q">Last 4 quarters</option>
                    </select>
                    <select
                      value={reportsPeriodType}
                      onChange={(e) => setReportsPeriodType(e.target.value as 'month' | 'quarter')}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="month">Monthly</option>
                      <option value="quarter">Quarterly</option>
                    </select>
                    <button
                      onClick={syncReports}
                      disabled={reportsSyncLoading || !selectedClient || connectionStatus?.status !== 'connected'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reportsSyncLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Sync from QuickBooks
                    </button>
                  </div>
                </div>
                {reportsLoadError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {reportsLoadError}
                  </div>
                )}
                {reportsSyncResult && (
                  <div className="mb-4 space-y-2">
                    {reportsSyncResult.reportsSaved > 0 && (
                      <p className="text-sm text-green-700">
                        Synced {reportsSyncResult.reportsSaved} report(s). Data should appear below.
                      </p>
                    )}
                    {reportsSyncResult.errors.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <p className="font-medium mb-1">Some reports could not be fetched:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {reportsSyncResult.errors.slice(0, 10).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {reportsSyncResult.errors.length > 10 && (
                            <li>… and {reportsSyncResult.errors.length - 10} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {connectionStatus?.status !== 'connected' && selectedClient && (
                  <p className="text-sm text-amber-700 mb-4">
                    Connect or reconnect QuickBooks in the Overview tab to sync reports.
                  </p>
                )}
              </div>

              {!reportsData?.reports?.length && !reportsLoadError && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                  No reports loaded. Choose a range and click &quot;Sync from QuickBooks&quot; to pull P&amp;L, Balance Sheet, and Cash Flow.
                </div>
              )}

              {reportsData?.reports?.length ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {(() => {
                    const REPORT_TABS: Array<{ id: 'pnl' | 'balance_sheet' | 'cash_flow' | 'ar_aging' | 'ap_aging' | 'coa'; label: string }> = [
                      { id: 'pnl', label: 'Profit & Loss' },
                      { id: 'balance_sheet', label: 'Balance Sheet' },
                      { id: 'cash_flow', label: 'Cash Flow Statement' },
                      { id: 'ar_aging', label: 'AR Aging' },
                      { id: 'ap_aging', label: 'AP Aging' },
                      { id: 'coa', label: 'Chart of Accounts' },
                    ];
                    const typesWithReports = REPORT_TABS.filter(
                      (tab) => reportsData.reports.some((r: { report_type: string }) => r.report_type === tab.id)
                    );
                    const activeTabValid = typesWithReports.some((t) => t.id === activeReportTab);
                    const currentTab = activeTabValid ? activeReportTab : (typesWithReports[0]?.id ?? 'pnl');
                    const activeReports = reportsData.reports
                      .filter((r: { report_type: string }) => r.report_type === currentTab)
                      .sort((a: { period?: { label?: string; start_date?: string } }, b: { period?: { label?: string; start_date?: string } }) => {
                        const dateA = a.period?.start_date ?? a.period?.label ?? '';
                        const dateB = b.period?.start_date ?? b.period?.label ?? '';
                        return dateA.localeCompare(dateB, undefined, { numeric: true });
                      });

                    return (
                      <>
                        <div className="border-b border-gray-200">
                          <nav className="flex gap-0 overflow-x-auto" aria-label="Report types">
                            {typesWithReports.map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setActiveReportTab(tab.id)}
                                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                  currentTab === tab.id
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </nav>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {activeReports.length ? (
                            activeReports.map((r: { period?: { label: string }; period_id: string; raw_json: unknown; synced_at: string }, idx: number) => {
                              const raw = r.raw_json as Record<string, unknown>;
                              const flatRows = flattenReportRows((raw as { Rows?: unknown }).Rows);
                              return (
                                <div key={`${r.period_id}-${idx}`} className="p-6">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="font-medium text-gray-700">{r.period?.label ?? 'Period'}</span>
                                    <span className="text-xs text-gray-500">Synced {r.synced_at ? new Date(r.synced_at).toLocaleString() : ''}</span>
                                  </div>
                                  {flatRows.length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="text-left py-2 px-2 font-medium text-gray-600">Account</th>
                                            <th className="text-right py-2 px-2 font-medium text-gray-600">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {flatRows.slice(0, 200).map((fr, rowIdx) => (
                                            <tr key={rowIdx} className={`border-b border-gray-100 ${fr.isBold ? 'bg-gray-50/50' : ''}`}>
                                              <td
                                                className={`py-1.5 pr-4 text-gray-700 ${fr.isBold ? 'font-semibold' : ''}`}
                                                style={{ paddingLeft: `${8 + fr.depth * 20}px` }}
                                              >
                                                {fr.account || '—'}
                                              </td>
                                              <td className={`py-1.5 text-right tabular-nums ${fr.isBold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                {fr.value || ''}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      {flatRows.length > 200 && (
                                        <p className="text-xs text-gray-500 mt-2">Showing first 200 rows of {flatRows.length}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">{JSON.stringify(raw, null, 2).slice(0, 2000)}{(JSON.stringify(raw).length > 2000 ? '…' : '')}</pre>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-6 text-center text-gray-500 text-sm">No data for this report type.</div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          )}

          {/* Documents View */}
          {activeView === 'documents' && (
            <div className="space-y-6">
              {/* Document Upload Area */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      New Folder
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Document List */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Added
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-blue-500 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Invoice_2024_Q3.pdf</p>
                              <p className="text-xs text-gray-500">INV-2024-089</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">Invoice</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Nov 10, 2024</td>
                        <td className="px-4 py-3 text-sm text-gray-600">2.4 MB</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">QuickBooks</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button className="text-gray-600 hover:text-gray-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Alerts View */}
          {activeView === 'alerts' && (
            <div className="space-y-6">
              {/* Alert Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-900">Critical Alerts</p>
                      <p className="text-2xl font-bold text-red-600">
                        {alerts.filter(a => a.severity === 'critical').length}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Warnings</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {alerts.filter(a => a.severity === 'warning').length}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Info</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {alerts.filter(a => a.severity === 'info').length}
                      </p>
                    </div>
                    <Info className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Alert List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
                  <button className="text-sm text-gray-600 hover:text-gray-900">
                    Mark All Read
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-6 ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(alert.severity)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{alert.title}</h4>
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {alert.category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {alert.actionRequired && (
                          <button className="px-3 py-1 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50">
                            Take Action
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Integrations View */}
          {activeView === 'integrations' && (
            <div className="space-y-6">
              {/* Integration Status Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Integration Status</h3>
                  <span className="text-sm text-gray-500">3 of 20 connected</span>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">3 Active</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">17 Available</span>
                </div>
              </div>

              {/* Connected Integrations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* QuickBooks Card */}
                <div className="bg-white rounded-lg shadow-sm border-2 border-green-500 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">QuickBooks</h3>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Accounting & Invoicing</p>
                  <div className="space-y-1 mb-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last sync</span>
                      <span className="text-gray-700">2 mins ago</span>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    Manage
                  </button>
                </div>

                {/* Stripe Card */}
                <div className="bg-white rounded-lg shadow-sm border-2 border-green-500 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Stripe</h3>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Payment Processing</p>
                  <div className="space-y-1 mb-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last sync</span>
                      <span className="text-gray-700">5 mins ago</span>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    Manage
                  </button>
                </div>

                {/* Plaid Card */}
                <div className="bg-white rounded-lg shadow-sm border-2 border-green-500 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Plaid</h3>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Banking & Financial Data</p>
                  <div className="space-y-1 mb-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last sync</span>
                      <span className="text-gray-700">1 min ago</span>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes & Tasks View */}
          {activeView === 'notes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notes Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Client Notes</h3>
                  <button
                    onClick={() => setEditingNotes(!editingNotes)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {editingNotes ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                {editingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add notes about this client..."
                    />
                    <button
                      onClick={saveNotes}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Notes
                    </button>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {notes || 'No notes yet. Click Edit to add notes.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Tasks Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Tasks & Reminders</h3>
                  <button className="text-blue-600 hover:text-blue-800">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Review Q3 financials</p>
                        <p className="text-xs text-gray-500">Due tomorrow at 5:00 PM</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">High</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                </h2>
                <button
                  onClick={() => {
                    setShowAssetModal(false);
                    setEditingAsset(null);
                    setAssetFormData({
                      category: 'fixed',
                      depreciationMethod: 'straight-line',
                      status: 'active',
                      usefulLife: 5,
                      salvageValue: 0
                    });
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Asset Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    value={assetFormData.name || ''}
                    onChange={(e) => setAssetFormData({...assetFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Dell Server Model XYZ"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={assetFormData.category || 'fixed'}
                    onChange={(e) => setAssetFormData({...assetFormData, category: e.target.value as Asset['category']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Fixed Assets</option>
                    <option value="intangible">Intangible Assets</option>
                    <option value="investment">Investments</option>
                    <option value="inventory">Inventory</option>
                    <option value="lease">Leases</option>
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subcategory *
                  </label>
                  <input
                    type="text"
                    value={assetFormData.subcategory || ''}
                    onChange={(e) => setAssetFormData({...assetFormData, subcategory: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., IT Equipment, Real Estate"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={assetFormData.purchaseDate || ''}
                    onChange={(e) => setAssetFormData({...assetFormData, purchaseDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Price *
                  </label>
                  <input
                    type="number"
                    value={assetFormData.purchasePrice || ''}
                    onChange={(e) => setAssetFormData({
                      ...assetFormData, 
                      purchasePrice: parseFloat(e.target.value),
                      currentValue: assetFormData.currentValue || parseFloat(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Depreciation Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Depreciation Method
                  </label>
                  <select
                    value={assetFormData.depreciationMethod || 'straight-line'}
                    onChange={(e) => setAssetFormData({...assetFormData, depreciationMethod: e.target.value as Asset['depreciationMethod']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="straight-line">Straight Line</option>
                    <option value="declining">Declining Balance</option>
                    <option value="units">Units of Production</option>
                    <option value="none">No Depreciation</option>
                  </select>
                </div>

                {/* Useful Life */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Useful Life (years)
                  </label>
                  <input
                    type="number"
                    value={assetFormData.usefulLife || 5}
                    onChange={(e) => setAssetFormData({...assetFormData, usefulLife: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>

                {/* Salvage Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salvage Value
                  </label>
                  <input
                    type="number"
                    value={assetFormData.salvageValue || 0}
                    onChange={(e) => setAssetFormData({...assetFormData, salvageValue: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={assetFormData.status || 'active'}
                    onChange={(e) => setAssetFormData({...assetFormData, status: e.target.value as Asset['status']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="disposed">Disposed</option>
                    <option value="impaired">Impaired</option>
                    <option value="under-maintenance">Under Maintenance</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={assetFormData.location || ''}
                    onChange={(e) => setAssetFormData({...assetFormData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Main Office, Warehouse A"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial/Asset Number
                  </label>
                  <input
                    type="text"
                    value={assetFormData.serialNumber || ''}
                    onChange={(e) => setAssetFormData({...assetFormData, serialNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., SN-123456"
                  />
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor/Supplier
                  </label>
                  <input
                    type="text"
                    value={assetFormData.vendor || ''}
                    onChange={(e) => setAssetFormData({...assetFormData, vendor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Dell, Apple, etc."
                  />
                </div>

                {/* Warranty Expiry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warranty Expiry
                  </label>
                  <input
                    type="date"
                    value={assetFormData.warranty || ''}
                    onChange={(e) => setAssetFormData({...assetFormData, warranty: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={assetFormData.notes || ''}
                    onChange={(e) => setAssetFormData({...assetFormData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional notes about this asset..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAssetModal(false);
                    setEditingAsset(null);
                    setAssetFormData({
                      category: 'fixed',
                      depreciationMethod: 'straight-line',
                      status: 'active',
                      usefulLife: 5,
                      salvageValue: 0
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAsset}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingAsset ? 'Update Asset' : 'Save Asset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedClient && (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select a Client</h2>
            <p className="text-gray-500">Choose a client from the dropdown to view their dashboard</p>
          </div>
        </div>
      )}
    </div>
  );
}