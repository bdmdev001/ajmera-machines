'use client';

import { useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, X, Save, Loader2, Tag, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';
import FieldError from '@/components/FieldError';
import { requiredMsg, urlMsg, isClean } from '@/lib/validation';

type PageSize = 25 | 50 | 100 | 'all';
const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100, 'all'];

export interface CategoryRow {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}

export default function AdminCategoryManager({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [cats, setCats] = useState<CategoryRow[]>(initialCategories);
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Search + pagination (client-side, over the full category list).
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(1);

  const { modal, showSuccess, showError, confirm } = useAdminAlert();
  const invalid = (k: string): React.CSSProperties => (errors[k] ? { borderColor: 'var(--hot)' } : {});

  const openAdd = () => {
    setMode('add'); setEditingId(''); setName(''); setDescription(''); setImage(''); setErrors({}); setFormOpen(true);
  };
  const openEdit = (c: CategoryRow) => {
    setMode('edit'); setEditingId(c._id); setName(c.name); setDescription(c.description); setImage(c.image); setErrors({}); setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = { name: requiredMsg(name, 'Category name'), image: urlMsg(image, false, 'image URL') };
    setErrors(found);
    if (!isClean(found)) return;
    setSaving(true);
    try {
      const url = mode === 'add' ? '/api/categories' : `/api/categories/${editingId}`;
      const method = mode === 'add' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, image }),
      });
      const data = await res.json();
      if (!res.ok) { showError(mode === 'add' ? 'Could not add category' : 'Could not update category', data.error); return; }

      const saved = data.category;
      if (mode === 'add') {
        setCats((prev) => [...prev, { _id: String(saved._id), name: saved.name, slug: saved.slug, description: saved.description || '', image: saved.image || '', productCount: 0 }]
          .sort((a, b) => a.name.localeCompare(b.name)));
        showSuccess('Category added', `“${saved.name}” is now available in the Add Machine dropdown.`);
      } else {
        setCats((prev) => prev.map((c) => (c._id === editingId ? { ...c, name: saved.name, slug: saved.slug, description: saved.description || '', image: saved.image || '' } : c))
          .sort((a, b) => a.name.localeCompare(b.name)));
        showSuccess('Category updated', 'Any machines in this category were updated to the new name.');
      }
      setFormOpen(false);
    } catch {
      showError('Network error', 'Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CategoryRow) => {
    if (c.productCount > 0) {
      showError('Cannot delete this category', `${c.productCount} machine${c.productCount === 1 ? ' is' : 's are'} still assigned to “${c.name}”. Reassign them to another category first.`);
      return;
    }
    const ok = await confirm({ title: `Delete “${c.name}”?`, message: 'This category will be permanently removed. This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;

    try {
      const res = await fetch(`/api/categories/${c._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showError('Could not delete category', data.error); return; }
      setCats((prev) => prev.filter((x) => x._id !== c._id));
      showSuccess('Category deleted', `“${c.name}” has been removed.`);
    } catch {
      showError('Network error', 'Could not reach the server. Please try again.');
    }
  };

  // ---- Search (name / slug / description — partial, case-insensitive) ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cats;
    return cats.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q),
    );
  }, [cats, query]);

  // ---- Pagination (client-side over the filtered list) ----
  const total = filtered.length;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = pageSize === 'all' ? filtered : filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * (pageSize === 'all' ? total : pageSize) + 1;
  const rangeEnd = pageSize === 'all' ? total : Math.min(safePage * pageSize, total);

  // Changing the search or page size returns to page 1 (search/filter state is
  // otherwise preserved across navigation — `query` is never reset here).
  const onSearch = (v: string) => { setQuery(v); setPage(1); };
  const changePageSize = (s: PageSize) => { setPageSize(s); setPage(1); };
  const goToPage = (n: number) => { if (n < 1 || n > totalPages || n === safePage) return; setPage(n); };
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1);

  const th: React.CSSProperties = { padding: '16px 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left' };
  const td: React.CSSProperties = { padding: '14px 20px', fontSize: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {modal}

      {/* Toolbar: search + rows-per-page + add */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200, maxWidth: 380 }}>
          <input suppressHydrationWarning type="text" placeholder="Search categories…" value={query} onChange={(e) => onSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 14, borderRadius: 8 }} />
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            Rows
            <select value={String(pageSize)} onChange={(e) => changePageSize(e.target.value === 'all' ? 'all' : (Number(e.target.value) as PageSize))} style={{ width: 'auto', height: 40, padding: '0 30px 0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              {PAGE_SIZE_OPTIONS.map((opt) => <option key={String(opt)} value={String(opt)}>{opt === 'all' ? 'All' : opt}</option>)}
            </select>
          </label>
          <button onClick={openAdd} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14 }}>
            <Plus size={16} /> Add Category
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={th}>Category</th>
                <th style={th}>Slug</th>
                <th style={th}>Machines</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', flexShrink: 0 }}><Tag size={16} /></span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                        {c.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{c.slug}</td>
                  <td style={td}>
                    <span className="badge badge-soft">{c.productCount} machine{c.productCount === 1 ? '' : 's'}</span>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(c)} aria-label="Edit category" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}><Edit3 size={15} /></button>
                      <button onClick={() => handleDelete(c)} aria-label="Delete category" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {total === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                  {query.trim() ? 'No categories match your search.' : 'No categories yet. Add your first one to populate the Add Machine dropdown.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: count + pagination */}
        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '14px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {rangeStart.toLocaleString('en-US')}–{rangeEnd.toLocaleString('en-US')} of {total.toLocaleString('en-US')} categor{total === 1 ? 'y' : 'ies'}
            </span>
            {pageSize !== 'all' && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} aria-label="Previous page" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: safePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.5 : 1 }}><ChevronLeft size={16} /></button>
                {pageNumbers.map((n, idx) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {idx > 0 && pageNumbers[idx - 1] !== n - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                    <button type="button" onClick={() => goToPage(n)} style={{ minWidth: 36, height: 36, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', border: '1px solid ' + (n === safePage ? 'var(--accent)' : 'var(--border-light)'), background: n === safePage ? 'var(--accent)' : 'var(--bg-surface)', color: n === safePage ? '#fff' : 'var(--text-primary)' }}>{n}</button>
                  </span>
                ))}
                <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} aria-label="Next page" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: safePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.5 : 1 }}><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {formOpen && (
        <div className="animate-fade-in" onClick={() => setFormOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'grid', placeItems: 'center', padding: 20, overflowY: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 480, padding: 30, position: 'relative', boxShadow: 'var(--shadow-lg)' }}>
            <button onClick={() => setFormOpen(false)} aria-label="Close" style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{mode === 'add' ? 'Add New Category' : 'Edit Category'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Category Name *</label>
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => (p.name ? { ...p, name: '' } : p)); }} onBlur={() => setErrors((p) => ({ ...p, name: requiredMsg(name, 'Category name') }))} placeholder="e.g. Surface Grinder" aria-invalid={!!errors.name} style={{ padding: '10px 14px', fontSize: 14, ...invalid('name') }} />
                <FieldError message={errors.name} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" style={{ padding: '10px 14px', fontSize: 14 }} />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input type="text" value={image} onChange={(e) => { setImage(e.target.value); setErrors((p) => (p.image ? { ...p, image: '' } : p)); }} onBlur={() => setErrors((p) => ({ ...p, image: urlMsg(image, false, 'image URL') }))} placeholder="https://… (optional)" aria-invalid={!!errors.image} style={{ padding: '10px 14px', fontSize: 14, ...invalid('image') }} />
                <FieldError message={errors.image} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-light)', paddingTop: 20 }}>
                <button type="button" onClick={() => setFormOpen(false)} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: 14 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '10px 24px', fontSize: 14 }}>
                  {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save Category</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
