import { redirect } from 'next/navigation';

/* The Customers module has been unified into Leads & Customers. Any old link or
   bookmark to /admin/customers now lands on the new CRM. */
export default function AdminCustomersRedirect() {
  redirect('/admin/leads');
}
