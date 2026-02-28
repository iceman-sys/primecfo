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
      is_active: body.is_active ?? true
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

// GET method to test the API endpoint and check database connection
export async function GET() {
  try {
    const supabase = supabaseAdmin();
    // Test database connection
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return NextResponse.json({ 
        message: 'API is running but database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Client API is working',
      database: 'Connected',
      clientCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      message: 'API error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}