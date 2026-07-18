'use client';

import { useEffect, useState } from 'react';
import {
  Search, Plus, Edit3, Trash2, Loader2, ChevronLeft, ChevronRight,
  Building2, Mail, Phone, MessageCircle,
} from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';
import VendorFormModal, { type VendorData } from '@/components/VendorFormModal';

type PageSize = 25 | 50 | 100 | 'all';
const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100, 'all'];
const STATUS_FILTERS = ['All', 'Active', 'Inactive'] as const;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'Active';
  return <span className="badge" style={{ background: active ? 'rgba(31,175,82,0.12)' : 'var(--bg-surface-2)', color: active ? '#1faf52' : 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>{status}</span>;
}

export default function AdminVendorsManager() {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editing, setEditing] = useState<Partial<VendorData> | undefined>(undefined);

  const { modal, showSuccess, showError, confirm } = useAdminAlert();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
        if (q.trim()) params.set('q', q.trim());
        if (status !== 'All') params.set('status', status);
        const res = await fetch(`/api/admin/vendors?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { showError('Could not load vendors', data.error || 'Please try again.'); return; }
        setVendors(data.vendors);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.page !== page) setPage(data.page);
      } catch {
        if (!cancelled) showError('Network error', 'Could not reach the server. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, pageSize, q, status, refreshKey, showError]);

  const onSearch = (v: string) => { setLoading(true); setQ(v); setPage(1); };
  const onStatus = (s: 'All' | 'Active' | 'Inactive') => { setLoading(true); setStatus(s); setPage(1); };
  const changePageSize = (s: PageSize) => { setLoading(true); setPageSize(s); setPage(1); };
  const goToPage = (n: number) => { if (n < 1 || n > totalPages || n === page) return; setLoading(true); setPage(n); };

  const openAdd = () => { setFormMode('add'); setEditing(undefined); setFormOpen(true); };
  const openEdit = (v: VendorData) => { setFormMode('edit'); setEditing(v); setFormOpen(true); };

  const handleSaved = (saved: VendorData) => {
    setFormOpen(false); setLoading(true); setRefreshKey((k) => k + 1);
    showSuccess(formMode === 'add' ? 'Vendor added' : 'Vendor updated', `“${saved.companyName}” has been saved.`);
  };

  const handleDelete = async (v: VendorData) => {
    const ok = await confirm({ title: 'Delete this vendor?', message: `“${v.companyName}” will be permanently removed. This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/vendors/${v._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showError('Could not delete vendor', data.error || 'Please try again.'); return; }
      const targetPage = vendors.length === 1 && page > 1 ? page - 1 : page;
      setLoading(true);
      if (targetPage !== page) setPage(targetPage); else setRefreshKey((k) => k + 1);
      showSuccess('Vendor deleted', `“${v.companyName}” has been removed.`);
    } catch {
      showError('Network error', 'Could not delete the vendor. Please try again.');
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);
  const th: React.CSSProperties = { padding: '14px 18px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '14px 18px', fontSize: 13.5, verticalAlign: 'top' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {modal}
      {formOpen && (
        <VendorFormModal mode={formMode} initial={editing} onClose={() => setFormOpen(false)} onSaved={handleSaved} onError={showError} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Building2 size={22} /></span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{total.toLocaleString('en-US')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>vendor{total === 1 ? '' : 's'} / suppliers</div>
          </div>
        </div>
        <button onClick={openAdd} className="btn btn-primary btn-sm"><Plus size={15} /> Add vendor</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
          <input suppressHydrationWarning type="text" placeholder="Search vendors…" value={q} onChange={(e) => onSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 14, borderRadius: 8 }} />
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <div className="tabs">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => onStatus(s)} className={`tab ${status === s ? 'is-active' : ''}`}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: 10, fontSize: 14 }}>Loading vendors…</div>
          </div>
        ) : vendors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            {q.trim() || status !== 'All' ? 'No vendors match your filters.' : 'No vendors yet — add your first vendor or supplier.'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="cust-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={th}>Company / Contact</th>
                    <th style={th}>Email</th>
                    <th style={th}>Phone</th>
                    <th style={th}>WhatsApp</th>
                    <th style={th}>GST</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v.companyName}</div>
                        {v.contactPerson && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{v.contactPerson}</div>}
                      </td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{v.email || '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{v.phone || '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{v.whatsapp || '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{v.gstNumber || '—'}</td>
                      <td style={td}><StatusBadge status={v.status} /></td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(v)} aria-label="Edit vendor" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}><Edit3 size={15} /></button>
                        <button onClick={() => handleDelete(v)} aria-label="Delete vendor" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4d')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="cust-cards" style={{ display: 'none', flexDirection: 'column' }}>
              {vendors.map((v) => (
                <div key={v._id} style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{v.companyName} <StatusBadge status={v.status} /></div>
                      {v.contactPerson && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{v.contactPerson}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(v)} aria-label="Edit vendor" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(v)} aria-label="Delete vendor" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {v.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mail size={13} /> {v.email}</span>}
                    {v.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> {v.phone}</span>}
                    {v.whatsapp && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageCircle size={13} /> {v.whatsapp}</span>}
                  </div>
                  {(v.gstNumber || v.panNumber) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {v.gstNumber && <span>GST: {v.gstNumber}</span>}
                      {v.panNumber && <span>PAN: {v.panNumber}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{pageSize === 'all' ? `Showing ${vendors.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}` : `Page ${page} of ${totalPages}`}</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                Rows
                <select value={String(pageSize)} onChange={(e) => changePageSize(e.target.value === 'all' ? 'all' : (Number(e.target.value) as PageSize))} style={{ width: 'auto', height: 36, padding: '0 30px 0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                  {PAGE_SIZE_OPTIONS.map((opt) => <option key={String(opt)} value={String(opt)}>{opt === 'all' ? 'All' : opt}</option>)}
                </select>
              </label>
            </div>
            {pageSize !== 'all' && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1} aria-label="Previous page" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}><ChevronLeft size={16} /></button>
                {pageNumbers.map((n, idx) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {idx > 0 && pageNumbers[idx - 1] !== n - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                    <button type="button" onClick={() => goToPage(n)} style={{ minWidth: 36, height: 36, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', border: '1px solid ' + (n === page ? 'var(--accent)' : 'var(--border-light)'), background: n === page ? 'var(--accent)' : 'var(--bg-surface)', color: n === page ? '#fff' : 'var(--text-primary)' }}>{n}</button>
                  </span>
                ))}
                <button type="button" onClick={() => goToPage(page + 1)} disabled={page === totalPages} aria-label="Next page" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 820px) {
          .cust-table-wrap { display: none; }
          .cust-cards { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
