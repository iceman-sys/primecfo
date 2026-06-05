import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

export type ProvisionedClient = {
  client_id: string;
  client_name: string;
  company_name: string | null;
  email: string;
  user_id: string | null;
};

function displayNameFromEmail(email: string): string {
  const local = (email.split('@')[0] ?? 'User').replace(/[._+-]+/g, ' ').trim();
  if (!local) return 'My Business';
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Ensure the signed-in user has a clients row. Creates one on first access.
 * Also claims an existing unowned row with the same email (legacy admin-created).
 */
export async function ensureUserClient(user: User): Promise<ProvisionedClient> {
  const sb = supabaseAdmin();
  const email = (user.email ?? '').trim().toLowerCase();
  if (!email) {
    throw new Error('User email is required to provision a client');
  }

  const { data: byUser } = await sb
    .from('clients')
    .select('client_id, client_name, company_name, email, user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (byUser) return byUser as ProvisionedClient;

  const { data: byEmail } = await sb
    .from('clients')
    .select('client_id, client_name, company_name, email, user_id')
    .ilike('email', email)
    .is('user_id', null)
    .maybeSingle();

  if (byEmail) {
    const { data: claimed, error: claimError } = await sb
      .from('clients')
      .update({ user_id: user.id })
      .eq('client_id', byEmail.client_id)
      .is('user_id', null)
      .select('client_id, client_name, company_name, email, user_id')
      .single();

    if (claimError) {
      console.error('Failed to claim client by email:', claimError);
    } else if (claimed) {
      return claimed as ProvisionedClient;
    }
  }

  const clientName = displayNameFromEmail(email);
  const companyName = clientName;

  const { data: created, error: createError } = await sb
    .from('clients')
    .insert({
      client_name: clientName,
      company_name: companyName,
      email,
      user_id: user.id,
      is_active: true,
      client_type: 'Small Business',
    })
    .select('client_id, client_name, company_name, email, user_id')
    .single();

  if (createError) {
    if (createError.code === '23505') {
      const { data: retry } = await sb
        .from('clients')
        .select('client_id, client_name, company_name, email, user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (retry) return retry as ProvisionedClient;
    }
    throw new Error(createError.message || 'Failed to provision client');
  }

  return created as ProvisionedClient;
}
