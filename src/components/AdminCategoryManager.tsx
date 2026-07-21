'use client';

import { useState } from 'react';
import { Plus, Edit3, Trash2, X, Save, Loader2, Tag } from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';
import FieldError from '@/components/FieldError';
import { requiredMsg, urlMsg, isClean } from '@/lib/validation';

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

  const th: React.CSSProperties = { padding: '16px 20px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left' };
  const td: React.CSSProperties = { padding: '14px 20px', fontSize: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {modal}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={openAdd} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14 }}>
          <Plus size={16} /> Add Category
        </button>
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
              {cats.map((c) => (
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
              {cats.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No categories yet. Add your first one to populate the Add Machine dropdown.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
