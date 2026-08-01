'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, Plus, Edit3, Trash2, X, Save, Loader2, ChevronLeft, ChevronRight, Sparkles, CalendarClock,
} from 'lucide-react';
import { imageUrl, normalizeImages, type ProductImage } from '@/lib/images';
import { useAdminAlert } from '@/components/AdminModal';
import FieldError from '@/components/FieldError';
import ProductImageUploader from '@/components/ProductImageUploader';
import { requiredMsg, yearMsg, urlMsg, isClean } from '@/lib/validation';
import {
  latestArrivalState, toDateInput, parseScheduleDate, validateSchedule,
  PRIORITY_MIN, PRIORITY_MAX, LATEST_ARRIVALS_LIMIT, type LatestArrivalState,
} from '@/lib/latestArrivals';

const PAGE_SIZE_OPTIONS: (number | 'all')[] = [25, 50, 100, 'all'];

export interface CategoryOption { _id: string; name: string }

interface ProductData {
  id: string;
  stockNo: string;
  title: string;
  make: string;
  model: string;
  category: string;
  categoryId?: string;
  country: string;
  myear: string;
  videoUrl?: string;
  technicalSpecifications?: string;
  description?: string;
  images: ProductImage[]; // structured { url, public_id }
  isFeatured?: boolean;
  stockStatus?: 'In Stock' | 'Out of Stock';
  badges?: string[];
  isLatestArrival?: boolean;
  latestArrivalPriority?: number;
  /** ISO strings across the server→client boundary; '' when unset. */
  latestArrivalFrom?: string;
  latestArrivalUntil?: string;
}

const BADGE_SUGGESTIONS = ['Sold', 'Rare Machine', 'Coming Soon', 'Special Offer', 'New', 'Reserved', 'Price Drop'];

/** Latest Arrivals listing filter. */
type ArrivalFilter = 'all' | 'yes' | 'no';

const ARRIVAL_TONE: Record<Exclude<LatestArrivalState, 'off'>, { label: string; bg: string; color: string }> = {
  live: { label: 'Latest Arrival', bg: 'rgba(31,175,82,0.12)', color: '#1faf52' },
  scheduled: { label: 'Arrival scheduled', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  expired: { label: 'Arrival expired', bg: 'var(--bg-surface-2)', color: 'var(--text-muted)' },
};

function ArrivalBadge({ state }: { state: LatestArrivalState }) {
  if (state === 'off') return null;
  const t = ARRIVAL_TONE[state];
  return (
    <span className="badge" style={{ background: t.bg, color: t.color, fontSize: 10.5, fontWeight: 700 }}>{t.label}</span>
  );
}

interface Props {
  initialProducts: ProductData[];
  categories: CategoryOption[];
}

export default function AdminInventoryManager({ initialProducts, categories }: Props) {
  const [products, setProducts] = useState<ProductData[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [arrivalFilter, setArrivalFilter] = useState<ArrivalFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);

  // Bulk selection (by product id, so it survives paging and re-filtering).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [country, setCountry] = useState('');
  const [myear, setMyear] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [technicalSpecifications, setTechnicalSpecifications] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ProductImage[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [stockStatus, setStockStatus] = useState<'In Stock' | 'Out of Stock'>('In Stock');
  const [badges, setBadges] = useState<string[]>([]);
  const [badgeDraft, setBadgeDraft] = useState('');
  const [isLatestArrival, setIsLatestArrival] = useState(false);
  const [arrivalPriority, setArrivalPriority] = useState('0');
  const [arrivalFrom, setArrivalFrom] = useState('');
  const [arrivalUntil, setArrivalUntil] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invalidStyle = (k: string): React.CSSProperties => (errors[k] ? { borderColor: 'var(--hot)' } : {});

  const { modal, showSuccess, showError, confirm } = useAdminAlert();

  // Open Form for Adding
  const handleOpenAdd = () => {
    setFormMode('add');
    setEditingId('');
    setTitle('');
    setMake('');
    setModel('');
    setCategoryId('');
    setCountry('');
    setMyear('');
    setVideoUrl('');
    setTechnicalSpecifications('');
    setDescription('');
    setPhotos([]);
    setIsFeatured(false);
    setStockStatus('In Stock');
    setBadges([]);
    setBadgeDraft('');
    setIsLatestArrival(false);
    setArrivalPriority('0');
    setArrivalFrom('');
    setArrivalUntil('');
    setErrors({});
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (p: ProductData) => {
    setFormMode('edit');
    setErrors({});
    setEditingId(p.id);
    setTitle(p.title);
    setMake(p.make);
    setModel(p.model);
    setCategoryId(p.categoryId || '');
    setCountry(p.country);
    setMyear(p.myear || '');
    setVideoUrl(p.videoUrl || '');
    setTechnicalSpecifications(p.technicalSpecifications || '');
    setDescription(p.description || '');
    setPhotos(normalizeImages(p.images));
    setIsFeatured(Boolean(p.isFeatured));
    setStockStatus(p.stockStatus === 'Out of Stock' ? 'Out of Stock' : 'In Stock');
    setBadges(Array.isArray(p.badges) ? p.badges : []);
    setBadgeDraft('');
    setIsLatestArrival(Boolean(p.isLatestArrival));
    setArrivalPriority(String(p.latestArrivalPriority ?? 0));
    setArrivalFrom(toDateInput(p.latestArrivalFrom));
    setArrivalUntil(toDateInput(p.latestArrivalUntil));
    setIsFormOpen(true);
  };

  // Badge chip helpers (free-form; admin can type any label or pick a suggestion).
  const addBadge = (raw: string) => {
    const b = raw.trim();
    if (!b) return;
    setBadges((prev) => (prev.some((x) => x.toLowerCase() === b.toLowerCase()) ? prev : [...prev, b]));
    setBadgeDraft('');
  };
  const removeBadge = (b: string) => setBadges((prev) => prev.filter((x) => x !== b));

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found = {
      title: requiredMsg(title, 'Machine title'),
      myear: yearMsg(myear),
      videoUrl: urlMsg(videoUrl, false, 'YouTube video link'),
      // Only meaningful while the section is switched on.
      arrivalUntil: isLatestArrival
        ? validateSchedule(parseScheduleDate(arrivalFrom, 'start'), parseScheduleDate(arrivalUntil, 'end'))
        : '',
    };
    setErrors(found);
    if (!isClean(found)) return;

    setIsSubmitting(true);
    // Send categoryId — the server resolves the category NAME from it, keeping
    // product.category and product.categoryId consistent.
    const payload = {
      title,
      make,
      model,
      categoryId: categoryId || null,
      country,
      myear,
      videoUrl,
      technicalSpecifications,
      description,
      images: photos, // structured [{ url, public_id }]
      isFeatured,
      stockStatus,
      badges,
      isLatestArrival,
      latestArrivalPriority: arrivalPriority,
      latestArrivalFrom: arrivalFrom,
      latestArrivalUntil: arrivalUntil,
    };

    try {
      const url = formMode === 'add' ? '/api/products' : `/api/products/${editingId}`;
      const method = formMode === 'add' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (formMode === 'add') {
          setProducts((prev) => [data.product, ...prev]);
        } else {
          setProducts((prev) => prev.map((p) => (p.id === editingId ? data.product : p)));
        }
        setIsFormOpen(false);
        showSuccess(formMode === 'add' ? 'Machine added' : 'Machine updated', `“${data.product.title}” has been saved.`);
      } else {
        showError('Could not save machine', data.error || 'Please check the details and try again.');
      }
    } catch {
      showError('Network error', 'Could not reach the server while saving. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Machinery
  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete this machine?', message: 'This will permanently remove the listing and its Cloudinary images. This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showSuccess('Machine deleted', 'The listing has been removed.');
      } else {
        const data = await response.json();
        showError('Could not delete machine', data.error || 'Please try again.');
      }
    } catch {
      showError('Network error', 'Could not reach the server while deleting. Please try again.');
    }
  };

  // Bulk add/remove for the current selection.
  const runBulkArrival = async (action: 'add' | 'remove') => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch('/api/products/latest-arrivals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showError('Could not update Latest Arrivals', data.error || 'Please try again.'); return; }
      const patch = data.latestArrival as Partial<ProductData>;
      const touched = new Set(ids);
      setProducts((prev) => prev.map((p) => (touched.has(p.id)
        ? { ...p, ...patch, latestArrivalFrom: '', latestArrivalUntil: '' }
        : p)));
      setSelected(new Set());
      showSuccess(
        action === 'add' ? 'Added to Latest Arrivals' : 'Removed from Latest Arrivals',
        `${data.modified ?? ids.length} machine${(data.modified ?? ids.length) === 1 ? '' : 's'} updated.`,
      );
    } catch {
      showError('Network error', 'Could not reach the server. Please try again.');
    } finally {
      setBulkBusy(false);
    }
  };

  // Live description of the Latest Arrivals settings currently in the form.
  const arrivalStatusText = useMemo(() => {
    if (!isLatestArrival) return 'Not shown in Latest Arrivals.';
    const state = latestArrivalState({
      isLatestArrival: true,
      latestArrivalFrom: parseScheduleDate(arrivalFrom, 'start'),
      latestArrivalUntil: parseScheduleDate(arrivalUntil, 'end'),
    });
    if (state === 'scheduled') return `Scheduled — starts showing on ${arrivalFrom}.`;
    if (state === 'expired') return `Expired on ${arrivalUntil} — no longer shown. Clear or extend the end date to bring it back.`;
    return arrivalUntil ? `Showing on the homepage now, until the end of ${arrivalUntil}.` : 'Showing on the homepage now.';
  }, [isLatestArrival, arrivalFrom, arrivalUntil]);

  // Filter products by search query, then by the Latest Arrivals filter.
  const query = searchQuery.toLowerCase();
  const filteredProducts = products.filter((p) => {
    const matchesQuery =
      p.title.toLowerCase().includes(query) ||
      p.stockNo.toLowerCase().includes(query) ||
      p.make.toLowerCase().includes(query) ||
      p.model.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query);
    if (!matchesQuery) return false;
    if (arrivalFilter === 'yes') return Boolean(p.isLatestArrival);
    if (arrivalFilter === 'no') return !p.isLatestArrival;
    return true;
  });

  // Pagination (clamped so deletes / filtering never leave an empty page)
  const effectiveSize = pageSize === 'all' ? Math.max(filteredProducts.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / effectiveSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * effectiveSize;
  const pageItems = filteredProducts.slice(pageStart, pageStart + effectiveSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1);

  // Select-all applies to the rows actually on screen.
  const pageIds = pageItems.map((p) => p.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  const toggleRow = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const togglePage = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    return next;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {modal}
      {/* Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '360px' }}>
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Search inventory (Stock #, title, make...)"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            Latest Arrivals
            <select
              suppressHydrationWarning
              value={arrivalFilter}
              onChange={(e) => { setArrivalFilter(e.target.value as ArrivalFilter); setPage(1); }}
              style={{ width: 'auto', height: 40, padding: '0 30px 0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>

          {/* Add Machine Button */}
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px' }}>
            <Plus size={16} /> Add Machine
          </button>
        </div>
      </div>

      {/* Bulk action bar — only present once something is selected. */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent)' }}>
            {selected.size} selected
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <button type="button" onClick={() => runBulkArrival('add')} disabled={bulkBusy} className="btn btn-primary btn-sm">
              {bulkBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />} Add to Latest Arrivals
            </button>
            <button type="button" onClick={() => runBulkArrival('remove')} disabled={bulkBusy} className="btn btn-secondary btn-sm">
              <X size={14} /> Remove from Latest Arrivals
            </button>
            <button type="button" onClick={() => setSelected(new Set())} disabled={bulkBusy} className="btn btn-secondary btn-sm">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Inventory Table List */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '16px 8px 16px 20px', width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => { if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected; }}
                    onChange={togglePage}
                    aria-label="Select all machines on this page"
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                  />
                </th>
                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Image</th>
                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Stock #</th>
                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Title / Manufacturer</th>
                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Category</th>
                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Model</th>
                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Country</th>
                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => {
                const thumb = p.images && p.images.length > 0 ? imageUrl(p.images[0]) : 'https://placehold.co/60x60/eef1f4/93a0af?text=Machine';
                const isChecked = selected.has(p.id);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s', background: isChecked ? 'var(--accent-soft)' : undefined }}>
                    <td style={{ padding: '14px 8px 14px 20px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(p.id)}
                        aria-label={`Select ${p.title}`}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <img
                        src={thumb}
                        alt={p.title}
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#eef1f4', border: '1px solid var(--border-light)' }}
                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/50x50/eef1f4/93a0af?text=Machine'; }}
                      />
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: '700', color: 'var(--accent)', fontSize: '14px' }}>
                      {p.stockNo}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {p.title}
                        {p.isFeatured && (
                          <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 10.5, fontWeight: 700 }}>Featured</span>
                        )}
                        <ArrivalBadge state={latestArrivalState(p)} />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Make: {p.make}</div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px' }}>{p.category}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px' }}>{p.model}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px' }}>{p.country}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                          aria-label="Edit machinery details"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4d')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                          aria-label="Delete machinery entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    {arrivalFilter === 'yes' && !searchQuery
                      ? 'No machines are marked as Latest Arrivals yet — edit a machine, or select rows and use the bulk action.'
                      : 'No machines found in inventory.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {filteredProducts.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Showing {pageStart + 1}–{pageStart + pageItems.length} of {filteredProducts.length}
              </span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                Rows
                <select
                  suppressHydrationWarning
                  value={String(pageSize)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPageSize(v === 'all' ? 'all' : Number(v));
                    setPage(1);
                  }}
                  style={{ width: 'auto', height: 36, padding: '0 30px 0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={String(opt)} value={String(opt)}>{opt === 'all' ? 'All' : opt}</option>
                  ))}
                </select>
              </label>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={16} />
                </button>
                {pageNumbers.map((n, idx) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {idx > 0 && pageNumbers[idx - 1] !== n - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                    <button
                      type="button"
                      onClick={() => setPage(n)}
                      style={{
                        minWidth: 36, height: 36, padding: '0 8px', borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                        border: '1px solid ' + (n === currentPage ? 'var(--accent)' : 'var(--border-light)'),
                        background: n === currentPage ? 'var(--accent)' : 'var(--bg-surface)',
                        color: n === currentPage ? '#fff' : 'var(--text-primary)',
                      }}
                    >
                      {n}
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Machine Dialog Modal (Overlay overlay) */}
      {isFormOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
          className="animate-fade-in"
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '720px',
              padding: '30px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsFormOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>
              {formMode === 'add' ? 'Add New Machine' : `Edit Machine (${editingId})`}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Title */}
              <div className="form-group">
                <label>Machine Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setErrors((p) => (p.title ? { ...p, title: '' } : p)); }}
                  onBlur={() => setErrors((p) => ({ ...p, title: requiredMsg(title, 'Machine title') }))}
                  placeholder="e.g. OKAMOTO Make Surface Grinder"
                  aria-invalid={!!errors.title}
                  style={{ padding: '10px 14px', fontSize: '14px', ...invalidStyle('title') }}
                />
                <FieldError message={errors.title} />
              </div>

              {/* Grid 2 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row">
                <style jsx global>{`
                  @media (max-width: 576px) {
                    .form-row {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}</style>
                <div className="form-group">
                  <label>Manufacturer (Make)</label>
                  <input
                    type="text"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="e.g. Okamoto"
                    style={{ padding: '10px 14px', fontSize: '14px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. PSG-640X"
                    style={{ padding: '10px 14px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  {categories.length > 0 ? (
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      style={{ padding: '10px 14px', fontSize: '14px' }}
                    >
                      <option value="">— Select a category —</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 12px', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }}>
                      No categories yet.{' '}
                      <Link href="/admin/categories" style={{ color: 'var(--accent)', fontWeight: 700 }}>Add a category first →</Link>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Japan"
                    style={{ padding: '10px 14px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row">
                <div className="form-group">
                  <label>Manufacturing Year</label>
                  <input
                    type="text"
                    value={myear}
                    onChange={(e) => { setMyear(e.target.value); setErrors((p) => (p.myear ? { ...p, myear: '' } : p)); }}
                    onBlur={() => setErrors((p) => ({ ...p, myear: yearMsg(myear) }))}
                    placeholder="e.g. 1988"
                    aria-invalid={!!errors.myear}
                    style={{ padding: '10px 14px', fontSize: '14px', ...invalidStyle('myear') }}
                  />
                  <FieldError message={errors.myear} />
                </div>
                <div className="form-group">
                  <label>YouTube Video Link</label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => { setVideoUrl(e.target.value); setErrors((p) => (p.videoUrl ? { ...p, videoUrl: '' } : p)); }}
                    onBlur={() => setErrors((p) => ({ ...p, videoUrl: urlMsg(videoUrl, false, 'YouTube video link') }))}
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    aria-invalid={!!errors.videoUrl}
                    style={{ padding: '10px 14px', fontSize: '14px', ...invalidStyle('videoUrl') }}
                  />
                  <FieldError message={errors.videoUrl} />
                </div>
              </div>

              {/* Product Description (customer-facing) */}
              <div className="form-group">
                <label>Product Description</label>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4, marginBottom: 4 }}>
                  A short, positive, buyer-focused paragraph about this specific machine — its purpose,
                  application and suitability. Shown on the product details page. Don&apos;t repeat the
                  specifications below or include any disclaimer. Leave blank to auto-generate one.
                </span>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={'e.g. This radial drilling machine is well suited to fabrication and general engineering workshops, offering dependable performance for drilling, reaming and tapping across a range of components. A cost-effective, ready-to-use option for buyers seeking reliable pre-owned machinery.'}
                  style={{ padding: '10px 14px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              {/* Technical Specifications */}
              <div className="form-group">
                <label>Technical Specifications (Pre-formatted)</label>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4, marginBottom: 4 }}>
                  One <code>Key : Value</code> per line. Include the machine&apos;s size and capacity
                  specs (e.g. <code>Table Size : 600 x 300 mm</code>, <code>Capacity : 10 Ton</code>) —
                  these power the homepage Size &amp; Capacity finder for this category. Use a
                  <code> / </code> to list multiple sizes (e.g. <code>600 x 300 mm / 800 x 400 mm</code>).
                </span>
                <textarea
                  rows={5}
                  value={technicalSpecifications}
                  onChange={(e) => setTechnicalSpecifications(e.target.value)}
                  placeholder={'Table Size : 600 x 300 mm\nSwing : 400 mm\nCapacity : 10 Ton'}
                  style={{ padding: '10px 14px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              {/* Stock status */}
              <div className="form-group">
                <label>Stock Status</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(['In Stock', 'Out of Stock'] as const).map((s) => (
                    <label key={s} style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', border: `1px solid ${stockStatus === s ? 'var(--accent)' : 'var(--border-light)'}`, borderRadius: 'var(--radius-sm)', background: stockStatus === s ? 'var(--accent-soft)' : 'var(--bg-surface)', cursor: 'pointer' }}>
                      <input type="radio" name="stockStatus" checked={stockStatus === s} onChange={() => setStockStatus(s)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: stockStatus === s ? 'var(--accent)' : 'var(--text-primary)' }}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom badges */}
              <div className="form-group">
                <label>Product Badges</label>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4, marginBottom: 4 }}>
                  Type a badge and press Enter (e.g. Sold, Rare Machine), or pick a suggestion. Shown on the product card &amp; detail page.
                </span>
                {badges.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {badges.map((b) => (
                      <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700 }}>
                        {b}
                        <button type="button" onClick={() => removeBadge(b)} aria-label={`Remove ${b}`} style={{ display: 'grid', placeItems: 'center', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={badgeDraft}
                  onChange={(e) => setBadgeDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBadge(badgeDraft); } }}
                  placeholder="Add a badge…"
                  style={{ padding: '10px 14px', fontSize: '14px' }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {BADGE_SUGGESTIONS.filter((s) => !badges.some((b) => b.toLowerCase() === s.toLowerCase())).map((s) => (
                    <button key={s} type="button" onClick={() => addBadge(s)} style={{ padding: '4px 10px', borderRadius: 'var(--radius-pill)', border: '1px dashed var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Mark as Featured</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Shows in the homepage &ldquo;Featured machines&rdquo; section.</span>
                </span>
              </label>

              {/* ---- Latest Arrivals ---- */}
              <fieldset style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '14px 16px 16px', margin: 0 }}>
                <legend style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 6px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Sparkles size={14} style={{ color: 'var(--accent)' }} /> Latest Arrivals
                </legend>

                <div className="form-group" style={{ marginBottom: isLatestArrival ? 14 : 0 }}>
                  <label>Show in Latest Arrivals</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {([['Yes', true], ['No', false]] as const).map(([label, val]) => (
                      <label key={label} style={{ flex: '1 1 120px', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', border: `1px solid ${isLatestArrival === val ? 'var(--accent)' : 'var(--border-light)'}`, borderRadius: 'var(--radius-sm)', background: isLatestArrival === val ? 'var(--accent-soft)' : 'var(--bg-surface)', cursor: 'pointer' }}>
                        <input type="radio" name="isLatestArrival" checked={isLatestArrival === val} onChange={() => setIsLatestArrival(val)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: isLatestArrival === val ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    The homepage section shows up to {LATEST_ARRIVALS_LIMIT} machines. Set to No to remove this one immediately — the listing itself stays active.
                  </span>
                </div>

                {isLatestArrival && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row">
                      <div className="form-group">
                        <label>Display Priority</label>
                        <input
                          type="number"
                          min={PRIORITY_MIN}
                          max={PRIORITY_MAX}
                          step={1}
                          value={arrivalPriority}
                          onChange={(e) => setArrivalPriority(e.target.value)}
                          onBlur={() => setArrivalPriority((v) => String(Math.min(PRIORITY_MAX, Math.max(PRIORITY_MIN, Math.trunc(Number(v)) || 0))))}
                          style={{ padding: '10px 14px', fontSize: '14px' }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Lower shows first. Equal priorities fall back to the most recently updated.</span>
                      </div>
                      <div className="form-group">
                        <label>Display From</label>
                        <input
                          type="date"
                          value={arrivalFrom}
                          onChange={(e) => { setArrivalFrom(e.target.value); setErrors((p) => (p.arrivalUntil ? { ...p, arrivalUntil: '' } : p)); }}
                          style={{ padding: '10px 14px', fontSize: '14px' }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Leave blank to show immediately.</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row">
                      <div className="form-group">
                        <label>Display Until</label>
                        <input
                          type="date"
                          value={arrivalUntil}
                          onChange={(e) => { setArrivalUntil(e.target.value); setErrors((p) => (p.arrivalUntil ? { ...p, arrivalUntil: '' } : p)); }}
                          aria-invalid={!!errors.arrivalUntil}
                          style={{ padding: '10px 14px', fontSize: '14px', ...invalidStyle('arrivalUntil') }}
                        />
                        <FieldError message={errors.arrivalUntil} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Shown through the end of this day, then drops off on its own. Blank = no end date.</span>
                      </div>
                      <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                        {/* Live read-out of what the settings above actually mean right now. */}
                        <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-2)' }}>
                          <CalendarClock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>{arrivalStatusText}</span>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </fieldset>

              {/* Image Upload Gallery — multi-select, drag-drop, reorder, replace, featured */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Machinery Images
                </label>
                <ProductImageUploader
                  initialImages={photos}
                  onChange={setPhotos}
                  onUploadingChange={setIsUploading}
                />
              </div>

              {/* Submit Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '20px',
                  marginTop: '10px',
                }}
              >
                {isUploading && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)', marginRight: 'auto' }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Waiting for image uploads to finish…
                  </span>
                )}
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '14px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || isUploading}
                  style={{ padding: '10px 24px', fontSize: '14px' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Save Machine
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
