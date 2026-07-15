import { redirect } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import AdminSubscribersManager from '@/components/AdminSubscribersManager';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminSubscribersPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin/login');

  return (
    <div style={{ paddingBottom: 80 }}>
      <AdminNav />
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Newsletter Subscribers</h1>
          <p style={{ fontSize: 14 }}>Everyone who signed up for arrivals & updates — newest first.</p>
        </div>
        <AdminSubscribersManager />
      </div>
    </div>
  );
}
