import { NextRequest, NextResponse } from 'next/server';
import {
  QuickBooksApiError,
  QuickBooksNeedsReauthError,
  quickBooksRequest,
} from '@/lib/qbo/api';

/** QBO Customer entity (subset we use). */
type QboCustomer = {
  Id?: string;
  DisplayName?: string;
  Balance?: number;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  Active?: boolean;
};

/** QBO Invoice entity (subset we use). */
type QboInvoice = {
  Id?: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  TotalAmt?: number;
  Balance?: number;
};

function mapCustomerToDashboard(c: QboCustomer | null): QuickBooksData['customer'] | null {
  if (!c) return null;
  return {
    id: c.Id ?? '',
    name: c.DisplayName ?? '—',
    balance: typeof c.Balance === 'number' ? c.Balance : 0,
    email: c.PrimaryEmailAddr?.Address,
    phone: c.PrimaryPhone?.FreeFormNumber,
    active: c.Active ?? true,
  };
}

function mapInvoicesToDashboard(invoices: QboInvoice[], customerId: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let totalAmount = 0;
  let overdueAmount = 0;
  const recent: Array<{ id: string; amount: number; balance: number; dueDate: string; date: string }> = [];

  const sorted = [...invoices].sort((a, b) => {
    const dA = a.TxnDate ? new Date(a.TxnDate).getTime() : 0;
    const dB = b.TxnDate ? new Date(b.TxnDate).getTime() : 0;
    return dB - dA;
  });

  for (const inv of sorted) {
    const amt = typeof inv.TotalAmt === 'number' ? inv.TotalAmt : 0;
    const bal = typeof inv.Balance === 'number' ? inv.Balance : 0;
    totalAmount += amt;
    if (inv.DueDate && new Date(inv.DueDate) < now && bal > 0) overdueAmount += bal;
    recent.push({
      id: inv.DocNumber ?? inv.Id ?? '',
      amount: amt,
      balance: bal,
      dueDate: inv.DueDate ?? '',
      date: inv.TxnDate ?? '',
    });
  }

  return {
    total: sorted.length,
    totalAmount,
    overdueAmount,
    recentInvoices: recent.slice(0, 50),
  };
}

/** Dashboard payload shape (matches QuickBooksData in dashboard). */
type QuickBooksData = {
  customer: {
    id: string;
    name: string;
    balance: number;
    email?: string;
    phone?: string;
    active: boolean;
  } | null;
  invoices: {
    total: number;
    totalAmount: number;
    overdueAmount: number;
    recentInvoices: Array<{ id: string; amount: number; balance: number; dueDate: string; date: string }>;
  };
  payments: { lastPaymentDate: string | null; lastPaymentAmount: number };
  status: string;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId')?.trim() || undefined;
  const customerIdRaw = searchParams.get('customerId');
  const customerId = customerIdRaw && customerIdRaw.trim() && customerIdRaw !== 'undefined'
    ? customerIdRaw.trim()
    : undefined;

  try {
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const customerQuery = customerId
      ? `select * from Customer where Id = '${customerId.replace(/'/g, "''")}'`
      : 'select * from Customer';

    const customerRes = await quickBooksRequest<{ QueryResponse?: { Customer?: QboCustomer[] } }>(
      clientId,
      {
        path: '/v3/company/{realmId}/query',
        method: 'GET',
        searchParams: { query: customerQuery },
      }
    );

    const rawCustomer = customerRes.QueryResponse?.Customer?.[0] ?? null;
    const customer = mapCustomerToDashboard(rawCustomer);

    let invoicesPayload = {
      total: 0,
      totalAmount: 0,
      overdueAmount: 0,
      recentInvoices: [] as Array<{ id: string; amount: number; balance: number; dueDate: string; date: string }>,
    };

    if (customerId) {
      const invoiceQuery = `select * from Invoice where CustomerRef = '${customerId.replace(/'/g, "''")}'`;
      try {
        const invoiceRes = await quickBooksRequest<{ QueryResponse?: { Invoice?: QboInvoice[] } }>(
          clientId,
          {
            path: '/v3/company/{realmId}/query',
            method: 'GET',
            searchParams: { query: invoiceQuery },
          }
        );
        const list = invoiceRes.QueryResponse?.Invoice ?? [];
        invoicesPayload = mapInvoicesToDashboard(list, customerId);
      } catch (err) {
        console.warn('QuickBooks Invoice query failed (customer may have no invoices):', err);
      }
    }

    const payload: QuickBooksData = {
      customer,
      invoices: invoicesPayload,
      payments: { lastPaymentDate: null, lastPaymentAmount: 0 },
      status: 'connected',
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof QuickBooksNeedsReauthError) {
      return NextResponse.json(
        { error: 'QuickBooks connection needs re-authorization', code: 'needs_reauth' },
        { status: 401 }
      );
    }
    if (error instanceof QuickBooksApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('Error fetching QBO data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
