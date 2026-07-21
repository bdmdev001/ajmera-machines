'use client';

import { useEffect, useState } from 'react';
import {
  Search, Plus, Edit3, Trash2, Loader2, ChevronLeft, ChevronRight,
  Users, FileSpreadsheet, FileDown, Mail, Phone, MessageCircle, MapPin,
} from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';
import CustomerFormModal, { type CustomerData } from '@/components/CustomerFormModal';

type PageSize = 25 | 50 | 100 | 'all';
const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100, 'all'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

export default function AdminCustomersManager() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editing, setEditing] = useState<Partial<CustomerData> | undefined>(undefined);

  const { modal, showSuccess, showError, confirm } = useAdminAlert();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
        if (q.trim()) params.set('q', q.trim());
        const res = await fetch(`/api/admin/customers?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { showError('Could not load customers', data.error || 'Please try again.'); return; }
        setCustomers(data.customers);
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
  }, [page, pageSize, q, refreshKey, showError]);

  const onSearch = (v: string) => { setLoading(true); setQ(v); setPage(1); };
  const changePageSize = (s: PageSize) => { setLoading(true); setPageSize(s); setPage(1); };
  const goToPage = (n: number) => { if (n < 1 || n > totalPages || n === page) return; setLoading(true); setPage(n); };

  const openAdd = () => { setFormMode('add'); setEditing(undefined); setFormOpen(true); };
  const openEdit = (c: CustomerData) => { setFormMode('edit'); setEditing(c); setFormOpen(true); };

  const handleSaved = (saved: CustomerData) => {
    setFormOpen(false);
    setLoading(true);
    setRefreshKey((k) => k + 1);
    showSuccess(formMode === 'add' ? 'Customer added' : 'Customer updated', `“${saved.companyName}” has been saved.`);
  };

  const handleDelete = async (c: CustomerData) => {
    const ok = await confirm({ title: 'Delete this customer?', message: `“${c.companyName}” will be permanently removed. This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/customers/${c._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showError('Could not delete customer', data.error || 'Please try again.'); return; }
      const targetPage = customers.length === 1 && page > 1 ? page - 1 : page;
      setLoading(true);
      if (targetPage !== page) setPage(targetPage); else setRefreshKey((k) => k + 1);
      showSuccess('Customer deleted', `“${c.companyName}” has been removed.`);
    } catch {
      showError('Network error', 'Could not delete the customer. Please try again.');
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);
  const th: React.CSSProperties = { padding: '14px 18px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '14px 18px', fontSize: 13.5, verticalAlign: 'top' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {modal}
      {formOpen && (
        <CustomerFormModal
          mode={formMode} initial={editing}
          onClose={() => setFormOpen(false)} onSaved={handleSaved} onError={showError}
        />
      )}

      {/* Header: count + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={22} /></span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{total.toLocaleString('en-US')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>customer{total === 1 ? '' : 's'} total</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Downloads from an API route (not a page) — Link would hijack navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/admin/customers/export?format=csv" download className="btn btn-secondary btn-sm"><FileDown size={15} /> CSV</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/admin/customers/export?format=xlsx" download className="btn btn-secondary btn-sm"><FileSpreadsheet size={15} /> Excel</a>
          <button onClick={openAdd} className="btn btn-primary btn-sm"><Plus size={15} /> Add customer</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
        <input suppressHydrationWarning type="text" placeholder="Search customers…" value={q} onChange={(e) => onSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 14, borderRadius: 8 }} />
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: 10, fontSize: 14 }}>Loading customers…</div>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            {q.trim() ? 'No customers match your search.' : 'No customers yet — add your first customer or convert an enquiry.'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="cust-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={th}>Customer / Company</th>
                    <th style={th}>Email</th>
                    <th style={th}>Phone</th>
                    <th style={th}>WhatsApp</th>
                    <th style={th}>Address</th>
                    <th style={th}>GST</th>
                    <th style={th}>PAN</th>
                    <th style={th}>Created</th>
                    <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.fullName}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{c.companyName}</div>
                      </td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{c.email}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{c.phone}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{c.whatsapp || '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)', maxWidth: 220, whiteSpace: 'normal' }}>{c.companyAddress || '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{c.gstNumber || '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{c.panNumber || '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }} suppressHydrationWarning>{formatDate(c.createdAt ?? null)}</td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(c)} aria-label="Edit customer" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}><Edit3 size={15} /></button>
                        <button onClick={() => handleDelete(c)} aria-label="Delete customer" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4d')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="cust-cards" style={{ display: 'none', flexDirection: 'column' }}>
              {customers.map((c) => (
                <div key={c._id} style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.fullName}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{c.companyName}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(c)} aria-label="Edit customer" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(c)} aria-label="Delete customer" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mail size={13} /> {c.email}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> {c.phone}</span>
                    {c.whatsapp && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageCircle size={13} /> {c.whatsapp}</span>}
                  </div>
                  {c.companyAddress && (
                    <div style={{ display: 'flex', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{c.companyAddress}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {c.gstNumber && <span>GST: {c.gstNumber}</span>}
                    {c.panNumber && <span>PAN: {c.panNumber}</span>}
                    <span suppressHydrationWarning>{formatDate(c.createdAt ?? null)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer: page size + pagination */}
        {!loading && total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{pageSize === 'all' ? `Showing ${customers.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}` : `Page ${page} of ${totalPages}`}</span>
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
