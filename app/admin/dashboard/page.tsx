import { redirect } from 'next/navigation';

/** Legacy admin home — subscribers is the operator console entry point. */
export default function AdminDashboardRedirect() {
  redirect('/admin/subscribers');
}
