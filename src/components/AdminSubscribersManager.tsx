'use client';

import { useEffect, useState } from 'react';
import { Mail, Trash2, Loader2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';

interface Subscriber {
  _id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribedAt: string | null;
}

type PageSize = 25 | 50 | 100 | 'all';
const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100, 'all'];

/** Deterministic date formatting (fixed locale + IST), consistent with enquiries. */
function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export default function AdminSubscribersManager() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [loading, setLoading] = useState(true);
  const [capped, setCapped] = useState(false);
  const [cap, setCap] = useState(1000);
  // Bumped to force a refetch of the same page (e.g. after a delete).
  const [refreshKey, setRefreshKey] = useState(0);

  const { modal, showSuccess, showError, confirm } = useAdminAlert();

  // Fetch whenever the page, page-size, or refresh trigger changes. Awaits the
  // request BEFORE any setState so nothing runs synchronously inside the effect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/subscribers?page=${page}&limit=${pageSize}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { showError('Could not load subscribers', data.error || 'Please try again.'); return; }
        setSubscribers(data.subscribers);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setCapped(Boolean(data.capped));
        setCap(data.cap || 1000);
        // Server clamps out-of-range pages; mirror that (may trigger one more fetch).
        if (data.page !== page) setPage(data.page);
      } catch {
        if (!cancelled) showError('Network error', 'Could not reach the server. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, pageSize, refreshKey, showError]);

  const changePageSize = (size: PageSize) => {
    setLoading(true);
    setPageSize(size);
    setPage(1); // switching size always resets to page 1
  };

  const goToPage = (n: number) => {
    if (n < 1 || n > totalPages || n === page) return;
    setLoading(true);
    setPage(n);
  };

  const handleDelete = async (sub: Subscriber) => {
    const ok = await confirm({
      title: 'Delete this subscriber?',
      message: `“${sub.email}” will be removed from the newsletter list. This cannot be undone.`,
      confirmLabel: 'Delete', danger: true,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/subscribers/${sub._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showError('Could not delete subscriber', data.error || 'Please try again.'); return; }

      // If we removed the last row on a page beyond the first, step back one;
      // otherwise refetch the current page to keep counts/pagination in sync.
      const targetPage = subscribers.length === 1 && page > 1 ? page - 1 : page;
      setLoading(true);
      if (targetPage !== page) setPage(targetPage);
      else setRefreshKey((k) => k + 1);
      showSuccess('Subscriber deleted', `“${sub.email}” has been removed.`);
    } catch {
      showError('Network error', 'Could not delete the subscriber. Please try again.');
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);

  const th: React.CSSProperties = { padding: '16px 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left' };
  const td: React.CSSProperties = { padding: '14px 20px', fontSize: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {modal}

      {/* Total count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={22} /></span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{total.toLocaleString('en-US')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>subscriber{total === 1 ? '' : 's'} total</div>
        </div>
      </div>

      {capped && (
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--accent)' }}>
          Showing the {cap.toLocaleString('en-US')} most recent subscribers (safety cap). Use a smaller page size to browse the rest.
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={th}>Email</th>
                <th style={th}>Status</th>
                <th style={th}>Subscribed</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
                  <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                  <div style={{ marginTop: 10, fontSize: 14 }}>Loading subscribers…</div>
                </td></tr>
              ) : subscribers.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No subscribers yet.</td></tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={s._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface-2)', color: 'var(--text-muted)', flexShrink: 0 }}><Mail size={15} /></span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.email}</span>
                      </div>
                    </td>
                    <td style={td}>
                      <span className="badge" style={{ background: s.status === 'active' ? 'rgba(31,175,82,0.12)' : 'var(--bg-surface-2)', color: s.status === 'active' ? '#1faf52' : 'var(--text-muted)' }}>
                        {s.status === 'active' ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>
                    <td style={{ ...td, color: 'var(--text-secondary)' }} suppressHydrationWarning>{formatDate(s.subscribedAt)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button onClick={() => handleDelete(s)} aria-label={`Delete ${s.email}`} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4d')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: page size + pagination */}
        {!loading && total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {pageSize === 'all'
                  ? `Showing ${subscribers.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`
                  : `Page ${page} of ${totalPages}`}
              </span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                Rows
                <select
                  value={String(pageSize)}
                  onChange={(e) => changePageSize(e.target.value === 'all' ? 'all' : (Number(e.target.value) as PageSize))}
                  style={{ width: 'auto', height: 36, padding: '0 30px 0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => <option key={String(opt)} value={String(opt)}>{opt === 'all' ? 'All' : opt}</option>)}
                </select>
              </label>
            </div>

            {pageSize !== 'all' && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1} aria-label="Previous page"
                  style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                  <ChevronLeft size={16} />
                </button>
                {pageNumbers.map((n, idx) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {idx > 0 && pageNumbers[idx - 1] !== n - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                    <button type="button" onClick={() => goToPage(n)}
                      style={{ minWidth: 36, height: 36, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                        border: '1px solid ' + (n === page ? 'var(--accent)' : 'var(--border-light)'), background: n === page ? 'var(--accent)' : 'var(--bg-surface)', color: n === page ? '#fff' : 'var(--text-primary)' }}>
                      {n}
                    </button>
                  </span>
                ))}
                <button type="button" onClick={() => goToPage(page + 1)} disabled={page === totalPages} aria-label="Next page"
                  style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
