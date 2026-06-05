import { redirect } from 'next/navigation';

/** Add-client flow lives in the main app at /clients. */
export default function AdminAddClientRedirect() {
  redirect('/clients');
}
