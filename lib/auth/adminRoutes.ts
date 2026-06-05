/** Admin users may only access the subscribers console under /admin. */
export function isAllowedAdminPath(pathname: string): boolean {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';

  if (path === '/admin' || path === '/admin/dashboard') return true;
  if (path === '/admin/subscribers' || path.startsWith('/admin/subscribers/')) return true;

  // Legacy client routes redirect to /clients in the main app
  if (path === '/admin/clients' || path.startsWith('/admin/clients/')) return true;

  return false;
}
