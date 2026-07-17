'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Edit3, Trash2, X, Upload, Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl, normalizeImages, type ProductImage } from '@/lib/images';
import { useAdminAlert } from '@/components/AdminModal';

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
  images: ProductImage[]; // structured { url, public_id }
}

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
  const [photos, setPhotos] = useState<ProductImage[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    setPhotos([]);
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (p: ProductData) => {
    setFormMode('edit');
    setEditingId(p.id);
    setTitle(p.title);
    setMake(p.make);
    setModel(p.model);
    setCategoryId(p.categoryId || '');
    setCountry(p.country);
    setMyear(p.myear || '');
    setVideoUrl(p.videoUrl || '');
    setTechnicalSpecifications(p.technicalSpecifications || '');
    setPhotos(normalizeImages(p.images));
    setIsFormOpen(true);
  };

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
    if (!title) return;

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
      images: photos, // structured [{ url, public_id }]
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
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{p.title}</div>
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
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. OKAMOTO Make Surface Grinder"
                  style={{ padding: '10px 14px', fontSize: '14px' }}
                />
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
                    onChange={(e) => setMyear(e.target.value)}
                    placeholder="e.g. 1988"
                    style={{ padding: '10px 14px', fontSize: '14px' }}
                  />
                </div>
                <div className="form-group">
                  <label>YouTube Video Link</label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    style={{ padding: '10px 14px', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="form-group">
                <label>Technical Specifications (Pre-formatted)</label>
                <textarea
                  rows={4}
                  value={technicalSpecifications}
                  onChange={(e) => setTechnicalSpecifications(e.target.value)}
                  placeholder="Length : 1200mm&#10;Capacity : 35 ton"
                  style={{ padding: '10px 14px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

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
