import { redirect } from 'next/navigation';

/** Client management lives in the main app at /clients. */
export default function AdminClientsRedirect() {
  redirect('/clients');
}
