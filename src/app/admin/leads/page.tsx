import { redirect } from 'next/navigation';
import AdminLeadsManager from '@/components/AdminLeadsManager';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Leads &amp; Customers</h1>
          <p style={{ fontSize: 14 }}>Manage your entire pipeline — capture leads, qualify and follow up, convert to customers, and track every interaction in one place.</p>
        </div>
        <AdminLeadsManager />
      </div>
    </div>
  );
}
