import { z } from 'zod';

/**
 * Validated environment variables for the application.
 * Use these accessors instead of process.env to fail fast with clear errors.
 */

const supabasePublicSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  })
  .refine(
    (data) => data.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { message: 'Set at least one of NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' }
  );

function getSupabasePublicEnv() {
  const parsed = supabasePublicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(
      `Invalid Supabase env: ${JSON.stringify(msg)}. Set NEXT_PUBLIC_SUPABASE_URL and one of NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.`
    );
  }
  const { data } = parsed;
  return {
    url: data.NEXT_PUBLIC_SUPABASE_URL,
    key:
      data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      data.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      '',
  };
}

let cached: { url: string; key: string } | null = null;

/** Validated Supabase URL and anon key for browser/server client creation. */
export function getSupabasePublicConfig(): { url: string; key: string } {
  if (!cached) cached = getSupabasePublicEnv();
  return cached;
}
