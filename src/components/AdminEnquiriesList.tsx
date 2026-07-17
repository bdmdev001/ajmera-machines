'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Trash2, Mail, Phone, Calendar, User, ExternalLink, Building,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';
import { getProductUrl } from '@/lib/productUrl';

interface EnquiryData {
  _id: string;
  productId?: string;
  productTitle?: string;
  stockNo?: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  message: string;
  status: 'Pending' | 'Reviewed' | 'Resolved';
  createdAt: string;
}

interface Props {
  initialEnquiries: EnquiryData[];
}

type PageSize = 25 | 50 | 100 | 'all';
const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100, 'all'];

/**
 * Format a timestamp deterministically (fixed locale + IST timezone) so the
 * server (UTC) and the client (browser-local) render the SAME string — avoids
 * the "toLocaleString()" hydration mismatch.
 */
function formatSubmitted(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export default function AdminEnquiriesList({ initialEnquiries }: Props) {
  const [enquiries, setEnquiries] = useState<EnquiryData[]>(initialEnquiries);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Selection is a set of explicitly-chosen ids that persists across page
  // navigation (so cross-page bulk delete works). Nothing is ever deleted
  // unless its id is in this set.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { modal, showError, showSuccess, confirm } = useAdminAlert();

  const handleStatusChange = async (id: string, newStatus: 'Pending' | 'Reviewed' | 'Resolved') => {
    try {
      const response = await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setEnquiries((prev) =>
          prev.map((e) => (e._id === id ? { ...e, status: newStatus } : e))
        );
      } else {
        showError('Could not update status', 'Please try again.');
      }
    } catch {
      showError('Network error', 'Could not update the enquiry status. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete this enquiry?', message: 'This action cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      const response = await fetch(`/api/enquiries/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setEnquiries((prev) => prev.filter((e) => e._id !== id));
        setSelected((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showSuccess('Enquiry deleted', 'The enquiry has been removed.');
      } else {
        showError('Could not delete enquiry', 'Please try again.');
      }
    } catch {
      showError('Network error', 'Could not delete the enquiry. Please try again.');
    }
  };

  // ---- Filter & search (operate on the full dataset, unchanged) ----
  const filteredEnquiries = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return enquiries.filter((e) => {
      const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
      const matchesSearch =
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        (e.productTitle && e.productTitle.toLowerCase().includes(q)) ||
        (e.stockNo && e.stockNo.toLowerCase().includes(q)) ||
        (e.company && e.company.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [enquiries, filterStatus, searchQuery]);

  // ---- Pagination (client-side over the filtered list) ----
  const totalFiltered = filteredEnquiries.length;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = pageSize === 'all'
    ? filteredEnquiries
    : filteredEnquiries.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Changing the filter, search or page size resets to page 1 and clears the
  // selection (the visible grouping changes, so a stale selection would be
  // confusing / risky). Done here — not in an effect — so page navigation can
  // preserve the selection. `page` is never clamped in state: rendering always
  // uses the derived `safePage`, so a shrinking list can't leave it stranded.
  const resetView = () => { setPage(1); setSelected(new Set()); };
  const onSearchChange = (v: string) => { setSearchQuery(v); resetView(); };
  const applyStatusFilter = (s: string) => { setFilterStatus(s); resetView(); };
  const changePageSize = (size: PageSize) => { setPageSize(size); resetView(); };

  // ---- Selection helpers ----
  const pageIds = pageItems.map((e) => e._id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someOnPageSelected && !allOnPageSelected;
    }
  }, [someOnPageSelected, allOnPageSelected]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const ok = await confirm({
      title: `Delete ${ids.length} selected enquir${ids.length === 1 ? 'y' : 'ies'}?`,
      message: 'The selected enquiries will be permanently removed. This action cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
      danger: true,
    });
    if (!ok) return;

    setBulkDeleting(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const removed = new Set(ids);
        setEnquiries((prev) => prev.filter((e) => !removed.has(e._id)));
        setSelected(new Set());
        const n = data.deletedCount ?? ids.length;
        showSuccess('Enquiries deleted', `${n} enquir${n === 1 ? 'y' : 'ies'} removed.`);
      } else {
        showError('Could not delete enquiries', data.error || 'Please try again.');
      }
    } catch {
      showError('Network error', 'Could not delete the enquiries. Please try again.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const goToPage = (n: number) => {
    if (n < 1 || n > totalPages || n === safePage) return;
    setPage(n); // selection intentionally preserved across pages
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1);

  const rangeStart = totalFiltered === 0 ? 0 : (safePage - 1) * (pageSize === 'all' ? totalFiltered : pageSize) + 1;
  const rangeEnd = pageSize === 'all' ? totalFiltered : Math.min(safePage * pageSize, totalFiltered);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {modal}
      {/* Search and Filters Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Search enquiries..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              fontSize: '14px',
              borderRadius: '8px',
            }}
          />
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
        </div>

        {/* Status Filters */}
        <div className="tabs">
          {['All', 'Pending', 'Reviewed', 'Resolved'].map((status) => (
            <button
              key={status}
              onClick={() => applyStatusFilter(status)}
              className={`tab ${filterStatus === status ? 'is-active' : ''}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Selection / bulk actions bar */}
      {filteredEnquiries.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAllOnPage}
              aria-label="Select all enquiries on this page"
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            Select all on this page
            {selected.size > 0 && (
              <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>· {selected.size} selected</span>
            )}
          </label>

          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selected.size === 0 || bulkDeleting}
            className="btn"
            style={{
              padding: '9px 16px',
              fontSize: 13.5,
              color: '#fff',
              background: 'var(--hot)',
              opacity: selected.size === 0 || bulkDeleting ? 0.5 : 1,
              cursor: selected.size === 0 || bulkDeleting ? 'not-allowed' : 'pointer',
            }}
          >
            <Trash2 size={15} /> {bulkDeleting ? 'Deleting…' : `Delete selected${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      )}

      {/* Enquiries Grid/List */}
      {filteredEnquiries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {pageItems.map((enq) => {
            const isSelected = selected.has(enq._id);
            return (
            <div
              key={enq._id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-light)'}`,
                boxShadow: isSelected ? '0 0 0 1px var(--accent)' : 'none',
                borderRadius: 'var(--radius-md)',
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              }}
            >
              {/* Header Info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(enq._id)}
                    aria-label={`Select enquiry from ${enq.name}`}
                    style={{ width: 16, height: 16, marginTop: 4, cursor: 'pointer', flexShrink: 0, accentColor: 'var(--accent)' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} style={{ color: 'var(--accent)' }} /> {enq.name}
                    </h4>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={13} /> {enq.email}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} /> {enq.phone}
                      </span>
                      {enq.company && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building size={13} /> {enq.company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Status Dropdown */}
                  <select
                    suppressHydrationWarning
                    value={enq.status}
                    onChange={(e) => handleStatusChange(enq._id, e.target.value as 'Pending' | 'Reviewed' | 'Resolved')}
                    style={{
                      width: 'auto',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-strong)',
                      fontWeight: '700',
                      color:
                        enq.status === 'Pending'
                          ? 'var(--accent)'
                          : enq.status === 'Reviewed'
                          ? 'var(--secondary)'
                          : '#1faf52',
                    }}
                  >
                    <option value="Pending" style={{ color: 'var(--accent)', background: 'var(--bg-surface)' }}>Pending</option>
                    <option value="Reviewed" style={{ color: 'var(--secondary)', background: 'var(--bg-surface)' }}>Reviewed</option>
                    <option value="Resolved" style={{ color: '#25D366', background: 'var(--bg-surface)' }}>Resolved</option>
                  </select>

                  <button
                    onClick={() => handleDelete(enq._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ff4d4d';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 77, 77, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label="Delete enquiry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Machinery Reference (if any) */}
              {enq.stockNo && (
                <div
                  style={{
                    background: 'var(--accent-soft)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    border: '1px solid var(--border-glow)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Enquiry Machine:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{enq.productTitle}</strong>
                    <span style={{ color: 'var(--accent)', marginLeft: '10px', fontWeight: '700' }}>({enq.stockNo})</span>
                  </div>
                  {(enq.stockNo || enq.productId) && (
                    <a
                      href={enq.stockNo
                        ? getProductUrl({ title: enq.productTitle, stockNo: enq.stockNo })
                        : `/products/${enq.productId}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '12px',
                        color: 'var(--secondary)',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      View Specs <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              {/* Message Block */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Client Message:
                </span>
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {enq.message}
                </p>
              </div>

              {/* Date */}
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '10px',
                }}
              >
                <Calendar size={13} /> Submitted on{' '}
                <span suppressHydrationWarning>{formatSubmitted(enq.createdAt)}</span>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
          }}
        >
          No enquiries found matching your selections.
        </div>
      )}

      {/* Footer: page size + pagination */}
      {totalFiltered > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            padding: '14px 18px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {rangeStart.toLocaleString('en-US')}–{rangeEnd.toLocaleString('en-US')} of {totalFiltered.toLocaleString('en-US')}
            </span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              Per page
              <select
                value={String(pageSize)}
                onChange={(e) => changePageSize(e.target.value === 'all' ? 'all' : (Number(e.target.value) as PageSize))}
                style={{ width: 'auto', height: 36, padding: '0 30px 0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={String(opt)} value={String(opt)}>{opt === 'all' ? 'All' : opt}</option>
                ))}
              </select>
            </label>
          </div>

          {pageSize !== 'all' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} aria-label="Previous page"
                style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: safePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers.map((n, idx) => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {idx > 0 && pageNumbers[idx - 1] !== n - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                  <button
                    type="button" onClick={() => goToPage(n)}
                    style={{ minWidth: 36, height: 36, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', border: '1px solid ' + (n === safePage ? 'var(--accent)' : 'var(--border-light)'), background: n === safePage ? 'var(--accent)' : 'var(--bg-surface)', color: n === safePage ? '#fff' : 'var(--text-primary)' }}
                  >
                    {n}
                  </button>
                </span>
              ))}
              <button
                type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} aria-label="Next page"
                style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: safePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.5 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
