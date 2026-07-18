'use client';

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

export interface VendorData {
  _id?: string;
  companyName: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt?: string | null;
}

interface Props {
  mode: 'add' | 'edit';
  initial?: Partial<VendorData>;
  onClose: () => void;
  onSaved: (vendor: VendorData) => void;
  onError: (title: string, message?: string) => void;
}

const empty: VendorData = { companyName: '', gstNumber: '', panNumber: '', address: '', contactPerson: '', email: '', phone: '', whatsapp: '', notes: '', status: 'Active' };

/** Render this modal conditionally (mount on open) so state initialises fresh. */
export default function VendorFormModal({ mode, initial, onClose, onSaved, onError }: Props) {
  const [form, setForm] = useState<VendorData>(() => ({ ...empty, ...initial }));
  const [saving, setSaving] = useState(false);

  const set = (k: keyof VendorData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) { onError('Missing required field', 'Company name is required.'); return; }
    setSaving(true);
    try {
      const url = mode === 'add' ? '/api/admin/vendors' : `/api/admin/vendors/${form._id}`;
      const method = mode === 'add' ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError('Could not save vendor', data.error || 'Please try again.'); return; }
      onSaved(data.vendor as VendorData);
    } catch {
      onError('Network error', 'Could not reach the server while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6 };
  const input: React.CSSProperties = { padding: '10px 14px', fontSize: 14, width: '100%' };

  return (
    <div className="animate-fade-in" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 640, padding: 30, position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
        <button type="button" onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{mode === 'add' ? 'Add vendor / supplier' : 'Edit vendor / supplier'}</h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)' }}>Company details</div>
          <div>
            <label style={label}>Company name *</label>
            <input suppressHydrationWarning type="text" required value={form.companyName} onChange={set('companyName')} placeholder="Company name" style={input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="cust-form-row">
            <div><label style={label}>GST number</label><input suppressHydrationWarning type="text" value={form.gstNumber} onChange={set('gstNumber')} placeholder="Optional" style={input} /></div>
            <div><label style={label}>PAN number</label><input suppressHydrationWarning type="text" value={form.panNumber} onChange={set('panNumber')} placeholder="Optional" style={input} /></div>
          </div>
          <div><label style={label}>Address</label><textarea suppressHydrationWarning rows={2} value={form.address} onChange={set('address')} placeholder="Company address" style={{ ...input, resize: 'vertical' }} /></div>

          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: 4 }}>Contact details</div>
          <div><label style={label}>Contact person name</label><input suppressHydrationWarning type="text" value={form.contactPerson} onChange={set('contactPerson')} placeholder="Contact person" style={input} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="cust-form-row">
            <div><label style={label}>Email</label><input suppressHydrationWarning type="email" value={form.email} onChange={set('email')} placeholder="name@company.com" style={input} /></div>
            <div><label style={label}>Phone number</label><input suppressHydrationWarning type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" style={input} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="cust-form-row">
            <div><label style={label}>WhatsApp number</label><input suppressHydrationWarning type="tel" value={form.whatsapp} onChange={set('whatsapp')} placeholder="Optional" style={input} /></div>
            <div>
              <label style={label}>Status</label>
              <select suppressHydrationWarning value={form.status} onChange={set('status')} style={input}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div><label style={label}>Notes</label><textarea suppressHydrationWarning rows={2} value={form.notes} onChange={set('notes')} placeholder="Any additional notes" style={{ ...input, resize: 'vertical' }} /></div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-light)', paddingTop: 20, marginTop: 6 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: 14 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '10px 24px', fontSize: 14 }}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save vendor</>}
            </button>
          </div>
        </form>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 560px) { .cust-form-row { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </div>
  );
}
