import { SALES_EMAIL } from '@/lib/site/contact';

/**
 * Admin role — users on the ADMIN_EMAILS allowlist.
 *
 * Admins can access /admin/* (subscribers, client management) and operator
 * tools in the main app (multi-client picker, /clients API).
 *
 * The allowlist is the comma-separated `ADMIN_EMAILS` env var. When unset, it
 * falls back to the firm's SALES_EMAIL. Matching is case-insensitive.
 *
 * Always gate admin APIs and routes with `isAdminEmail` before returning data.
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return [SALES_EMAIL.toLowerCase()];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
