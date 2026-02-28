import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

export async function POST(request: Request) {
  let clientId: string | null = null;
  const supabase = supabaseAdmin();
  
  try {
    const body = await request.json();
    
    console.log('=== STARTING CLIENT CREATION ===');
    console.log('Received data:', body);
    
    // STEP 1: Create the client
    const clientData: any = {
      client_name: body.client_name,
      company_name: body.company_name || null,
      email: body.email,
      phone: body.phone || null,
      notes: body.notes || null,
      tags: body.tags?.length > 0 ? body.tags : null,
      client_type: body.client_type || null,
      is_active: body.is_active ?? true,
      qbo_customer_id: body.qbo_customer_id || null  // Now saves directly to clients table
    };

    console.log('Step 1: Inserting client:', clientData);

    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert(clientData)
      .select('*')
      .single();

    if (clientError) {
      console.error('❌ Client insertion failed:', clientError);
      
      if (clientError.code === '23505' || clientError.message?.includes('duplicate')) {
        return NextResponse.json(
          { error: 'A client with this email already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: clientError.message || 'Failed to add client' },
        { status: 400 }
      );
    }

    clientId = newClient.client_id;
    console.log('✅ Client created with ID:', clientId);
    if (body.qbo_customer_id) {
      console.log('✅ QuickBooks Customer ID saved:', body.qbo_customer_id);
    }

    // STEP 2: Create QBO Connection if company_id provided
    let qboConnectionId: string | null = null;
    
    if (body.qbo_company_id) {
      console.log('Step 2: Creating QBO connection for company_id:', body.qbo_company_id);
      
      const qboConnection = {
        client_id: clientId,
        company_id: body.qbo_company_id,
        customer_id: body.qbo_customer_id || null,
        realm_id: body.qbo_realm_id || null,
        sync_enabled: body.sync_enabled ?? false,
        sandbox_mode: body.sandbox_mode ?? false,
        status: body.connection_status || 'pending',
        notes: `Auto-created for ${newClient.client_name} on ${new Date().toISOString()}`
      };

      const { data: qboData, error: qboError } = await supabase
        .from('client_qbo_connections')
        .insert(qboConnection)
        .select()
        .single();
      
      if (qboError) {
        console.error('⚠️ QBO connection failed:', qboError);
        
        // Update client notes to track the QBO info even if connection fails
        const updatedNotes = `${clientData.notes || ''}\n\n[QBO Connection Failed]\nCompany ID: ${body.qbo_company_id}\nCustomer ID: ${body.qbo_customer_id || 'N/A'}\nError: ${qboError.message}`;
        
        await supabase
          .from('clients')
          .update({ notes: updatedNotes })
          .eq('client_id', clientId);
      } else {
        qboConnectionId = qboData.id;
        console.log('✅ QBO connection created with ID:', qboConnectionId);
      }
      
      // STEP 3: Create QBO Token record (placeholder for OAuth)
      if (qboConnectionId) {
        console.log('Step 3: Creating QBO token placeholder');
        
        const tokenData = {
          client_id: clientId,
          company_id: body.qbo_company_id,
          access_token: null, // Will be populated by OAuth flow
          refresh_token: null, // Will be populated by OAuth flow
          expires_at: null // Will be populated by OAuth flow
        };
        
        const { data: tokenRecord, error: tokenError } = await supabase
          .from('qbo_tokens')
          .insert(tokenData)
          .select()
          .single();
        
        if (tokenError) {
          console.error('⚠️ Token creation failed:', tokenError);
          
          // Try to handle duplicate key error
          if (tokenError.code === '23505') {
            console.log('Token record already exists for this client/company combo');
          }
        } else {
          console.log('✅ Token placeholder created:', tokenRecord.id);
        }
      }
    } else {
      console.log('ℹ️ No QBO company_id provided, skipping QBO setup');
    }

    // STEP 4: Fetch complete client data with relationships
    console.log('Step 4: Fetching complete client data with relationships');
    
    const { data: completeClient, error: fetchError } = await supabase
      .from('clients')
      .select(`
        *,
        client_qbo_connections!left (
          id,
          company_id,
          customer_id,
          realm_id,
          status,
          sync_enabled,
          sandbox_mode,
          connected_at
        ),
        qbo_tokens!left (
          id,
          company_id,
          expires_at
        )
      `)
      .eq('client_id', clientId)
      .single();

    if (fetchError) {
      console.warn('⚠️ Could not fetch complete data, returning basic client:', fetchError);
      return NextResponse.json({ 
        success: true,
        data: newClient,
        message: 'Client added successfully (basic data only)'
      });
    }

    console.log('=== CLIENT CREATION COMPLETE ===');
    console.log('Final client data:', completeClient);

    return NextResponse.json({ 
      success: true,
      data: completeClient,
      message: body.qbo_company_id 
        ? 'Client added successfully with QBO connection setup' 
        : 'Client added successfully'
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error);
    
    // If we created a client but something else failed, log it
    if (clientId) {
      console.error(`Client ${clientId} was created but subsequent operations failed`);
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        clientId: clientId // Include this so you know if partial data was created
      },
      { status: 500 }
    );
  }
}

// GET: list clients (for dashboard) or health check
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const list = searchParams.get('list') === '1';

  try {
    const supabase = supabaseAdmin();

    if (list) {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          client_qbo_connections (
            company_id,
            customer_id,
            sync_enabled,
            status,
            connected_at
          )
        `)
        .eq('is_active', true)
        .order('client_name', { ascending: true })
        .order('connected_at', { ascending: false, foreignTable: 'client_qbo_connections' });

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to fetch clients' },
          { status: 500 }
        );
      }

      const clients = data ?? [];
      const clientIds = clients.map((c: { client_id: string }) => c.client_id);
      const lastSyncByClient = new Map<string, string>();

      if (clientIds.length > 0) {
        const { data: reportRows } = await supabase
          .from('financial_reports')
          .select('client_id, synced_at')
          .in('client_id', clientIds);
        for (const r of reportRows ?? []) {
          const cur = lastSyncByClient.get(r.client_id);
          if (!cur || (r.synced_at && r.synced_at > cur)) {
            lastSyncByClient.set(r.client_id, r.synced_at ?? '');
          }
        }
      }

      const withLastSync = clients.map((c: { client_id: string }) => ({
        ...c,
        last_sync: lastSyncByClient.get(c.client_id) ?? null,
      }));
      return NextResponse.json(withLastSync);
    }

    // Health check
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        message: 'API is running but database connection failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Client API is working',
      database: 'Connected',
      clientCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      message: 'API error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// PATCH: update client (e.g. notes) for dashboard
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { client_id, notes } = body;
    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { error } = await supabase
      .from('clients')
      .update({ notes: notes ?? null })
      .eq('client_id', client_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: remove a client and related QBO data
export async function DELETE(request: Request) {
  try {
    let clientId: string | null = null;
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        const body = await request.json();
        clientId = (body.clientId ?? body.client_id ?? '').trim() || null;
      } catch {
        // ignore
      }
    }
    if (!clientId) {
      const { searchParams } = new URL(request.url);
      clientId = searchParams.get('clientId') ?? searchParams.get('client_id');
      clientId = (clientId ?? '').trim() || null;
    }
    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Remove related data first (foreign keys / references)
    await supabase.from('qbo_oauth_state').delete().eq('client_id', clientId);
    await supabase.from('quickbooks_connections').delete().eq('client_id', clientId);
    await supabase.from('client_qbo_connections').delete().eq('client_id', clientId);
    await supabase.from('qbo_tokens').delete().eq('client_id', clientId);

    const { error } = await supabase.from('clients').delete().eq('client_id', clientId);

    if (error) {
      console.error('Client delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
