/** Client-safe display helpers for auth UI (no secrets). */

export function emailInitials(email: string | null | undefined): string {
  if (!email) return '?';
  const local = email.split('@')[0]?.trim() ?? '';
  if (!local) return '?';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function emailDisplayName(email: string | null | undefined): string {
  if (!email) return 'Account';
  const local = email.split('@')[0]?.trim() ?? '';
  if (!local) return 'Account';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}
