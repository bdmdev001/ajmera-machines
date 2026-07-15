import { redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import Enquiry from '@/models/Enquiry';
import { isAdminAuthenticated } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';
import Link from 'next/link';
import { Package, ClipboardList, Clock, CheckCircle, ArrowRight, Plus, Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EnquiryDoc {
  _id: { toString(): string };
  name: string; email: string; phone: string; company?: string;
  productTitle?: string; stockNo?: string; message: string;
  status: 'Pending' | 'Reviewed' | 'Resolved';
}
interface CatCount { _id: string; count: number; }

const STATUS_TONE: Record<string, { bg: string; color: string }> = {
  Pending: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  Reviewed: { bg: 'var(--secondary-soft)', color: 'var(--secondary)' },
  Resolved: { bg: 'rgba(31,175,82,0.12)', color: '#1faf52' },
};

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }

  await dbConnect();

  let productCount = 0, totalEnquiryCount = 0, pendingEnquiryCount = 0, resolvedEnquiryCount = 0;
  let recentEnquiries: EnquiryDoc[] = [];
  let categoryCounts: CatCount[] = [];

  try {
    productCount = await Product.countDocuments({});
    totalEnquiryCount = await Enquiry.countDocuments({});
    pendingEnquiryCount = await Enquiry.countDocuments({ status: 'Pending' });
    resolvedEnquiryCount = await Enquiry.countDocuments({ status: 'Resolved' });
    recentEnquiries = await Enquiry.find({}).sort({ createdAt: -1 }).limit(5).lean() as unknown as EnquiryDoc[];
    categoryCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
  }

  const stats = [
    { icon: Package, value: productCount, label: 'Machines in stock', tone: 'var(--secondary)', bg: 'var(--secondary-soft)' },
    { icon: Clock, value: pendingEnquiryCount, label: 'Pending enquiries', tone: 'var(--accent)', bg: 'var(--accent-soft)' },
    { icon: CheckCircle, value: resolvedEnquiryCount, label: 'Resolved enquiries', tone: '#1faf52', bg: 'rgba(31,175,82,0.12)' },
    { icon: ClipboardList, value: totalEnquiryCount, label: 'Total enquiries', tone: 'var(--text-primary)', bg: 'var(--bg-surface-2)' },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      <AdminNav />
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
          <div>
            <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Dashboard</h1>
            <p style={{ fontSize: 14 }}>Overview of your inventory and client enquiries.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/admin/inventory" className="btn btn-secondary btn-sm"><Plus size={15} /> Add machine</Link>
            <Link href="/admin/enquiries" className="btn btn-primary btn-sm"><Inbox size={15} /> View enquiries</Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
          {stats.map((s) => (
            <div key={s.label} className="surface" style={{ padding: 22, borderRadius: 'var(--radius-lg)', display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 50, height: 50, borderRadius: 12, background: s.bg, color: s.tone, flexShrink: 0 }}>
                <s.icon size={24} />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: s.tone, lineHeight: 1 }}>{s.value}</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Split */}
        <div className="dash-layout" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Recent enquiries */}
          <div className="surface" style={{ padding: 26, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>Recent enquiries</h3>
              <Link href="/admin/enquiries" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentEnquiries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentEnquiries.map((enq, i) => {
                  const tone = STATUS_TONE[enq.status] ?? STATUS_TONE.Pending;
                  return (
                    <div key={enq._id.toString()} style={{ paddingBlock: 16, borderBottom: i < recentEnquiries.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14.5 }}>{enq.name}</span>
                        <span className="badge" style={{ background: tone.bg, color: tone.color }}>{enq.status}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: enq.stockNo ? 6 : 8 }}>
                        {enq.email} · {enq.phone}{enq.company ? ` · ${enq.company}` : ''}
                      </div>
                      {enq.stockNo && (
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--secondary)', marginBottom: 8 }}>
                          {enq.productTitle} ({enq.stockNo})
                        </div>
                      )}
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>
                        {enq.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>No enquiries received yet.</div>
            )}
          </div>

          {/* Top categories */}
          <div className="surface" style={{ padding: 26, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Top categories</h3>
            {categoryCounts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {categoryCounts.map((cat, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{cat._id || 'Uncategorized'}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{cat.count}</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${productCount ? (cat.count / productCount) * 100 : 0}%`, height: '100%', background: idx % 2 === 0 ? 'var(--accent)' : 'var(--secondary)', borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>No inventory data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
