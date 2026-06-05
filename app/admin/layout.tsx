import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';
import { isAllowedAdminPath } from '@/lib/auth/adminRoutes';

/**
 * Admin layout: ADMIN_EMAILS only, limited to subscribers + client management routes.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname =
    headersList.get('x-pathname') ??
    headersList.get('x-invoke-path') ??
    headersList.get('next-url')?.split('?')[0] ??
    '';

  if (pathname && !isAllowedAdminPath(pathname)) {
    redirect('/admin/subscribers');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/subscribers');
  }

  if (!isAdminEmail(user.email)) {
    redirect('/dashboard');
  }

  return children;
}
