import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminConfig } from './env';

let supabaseAdminInstance: SupabaseClient<any> | null = null;

export function supabaseAdmin(): SupabaseClient<any> {
  if (supabaseAdminInstance) return supabaseAdminInstance;
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  // We intentionally use `any` here because this repo does not include generated Supabase
  // Database types, and strict typing otherwise collapses table inserts/updates to `never`.
  supabaseAdminInstance = createClient<any>(url, serviceRoleKey);
  return supabaseAdminInstance;
}

  