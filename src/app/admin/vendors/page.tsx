import { redirect } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import AdminVendorsManager from '@/components/AdminVendorsManager';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminVendorsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <AdminNav />
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Vendors &amp; Suppliers</h1>
          <p style={{ fontSize: 14 }}>Manage your vendors and suppliers — create, edit, search and organise by status.</p>
        </div>
        <AdminVendorsManager />
      </div>
    </div>
  );
}
