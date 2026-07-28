import { redirect } from 'next/navigation';
import AdminLeadDetail from '@/components/AdminLeadDetail';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }
  const { id } = await params;

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="container">
        <AdminLeadDetail id={id} />
      </div>
    </div>
  );
}
