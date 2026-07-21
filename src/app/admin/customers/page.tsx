import { redirect } from 'next/navigation';
import AdminCustomersManager from '@/components/AdminCustomersManager';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Customers</h1>
          <p style={{ fontSize: 14 }}>Manage your customer records — create, edit, search, export, and convert enquiries into customers.</p>
        </div>
        <AdminCustomersManager />
      </div>
    </div>
  );
}
