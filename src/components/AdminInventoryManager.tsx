'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Edit3, Trash2, X, Upload, Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl, normalizeImages, type ProductImage } from '@/lib/images';
import { useAdminAlert } from '@/components/AdminModal';
import FieldError from '@/components/FieldError';
import { requiredMsg, yearMsg, urlMsg, isClean } from '@/lib/validation';

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
}

const BADGE_SUGGESTIONS = ['Sold', 'Rare Machine', 'Coming Soon', 'Special Offer', 'New', 'Reserved', 'Price Drop'];

interface Props {
  initialProducts: ProductData[];
  categories: CategoryOption[];
}

export default function AdminInventoryManager({ initialProducts, categories }: Props) {
  const [products, setProducts] = useState<ProductData[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);

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

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    const file = fileList[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.image?.url) {
        setPhotos((prev) => [...prev, data.image as ProductImage]);
      } else {
        showError('Image upload failed', data.error || 'Please try again.');
      }
    } catch {
      showError('Image upload failed', 'A network error occurred. Please try again.');
    } finally {
      setIsUploading(false);
      // Allow re-selecting the same file after a failed/removed upload.
      e.target.value = '';
    }
  };

  // Remove Image from Local Form Array (url + publicId stay aligned)
  const handleRemoveImage = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found = {
      title: requiredMsg(title, 'Machine title'),
      myear: yearMsg(myear),
      videoUrl: urlMsg(videoUrl, false, 'YouTube video link'),
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

  // Filter products by search query
  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.stockNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination (clamped so deletes / filtering never leave an empty page)
  const effectiveSize = pageSize === 'all' ? Math.max(filteredProducts.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / effectiveSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * effectiveSize;
  const pageItems = filteredProducts.slice(pageStart, pageStart + effectiveSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {modal}
      {/* Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
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

        {/* Add Machine Button */}
        <button onClick={handleOpenAdd} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px' }}>
          <Plus size={16} /> Add Machine
        </button>
      </div>

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
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }}>
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No machines found in inventory.
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
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Shows in the homepage &ldquo;Featured machines&rdquo; section. Latest Arrivals updates automatically by date.</span>
                </span>
              </label>

              {/* Image Upload Gallery */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Machinery Images
                </label>

                {/* Images list previews */}
                {photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {photos.map((photo, idx) => (
                      <div
                        key={photo.url || idx}
                        style={{
                          position: 'relative',
                          width: '70px',
                          height: '70px',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: '#eef1f4',
                        }}
                      >
                        <img src={imageUrl(photo.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            color: 'var(--hot)',
                            border: '1px solid var(--border-light)',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      backgroundColor: 'var(--bg-surface-2)',
                      border: '1px dashed var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={14} /> Upload Image
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
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
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '14px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
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
