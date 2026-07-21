'use client';

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import FieldError from '@/components/FieldError';
import { requiredMsg, emailMsg, phoneMsg, gstMsg, panMsg, isClean } from '@/lib/validation';

export interface CustomerData {
  _id?: string;
  companyName: string;
  gstNumber?: string;
  panNumber?: string;
  companyAddress?: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  createdAt?: string | null;
}

interface Props {
  mode: 'add' | 'edit';
  initial?: Partial<CustomerData>;
  /** When set, the enquiry is linked to the created customer after a successful add. */
  linkEnquiryId?: string;
  onClose: () => void;
  onSaved: (customer: CustomerData) => void;
  onError: (title: string, message?: string) => void;
}

const empty: CustomerData = { companyName: '', gstNumber: '', panNumber: '', companyAddress: '', fullName: '', email: '', phone: '', whatsapp: '' };

/** Render this modal conditionally (mount on open) so state initialises fresh. */
export default function CustomerFormModal({ mode, initial, linkEnquiryId, onClose, onSaved, onError }: Props) {
  const [form, setForm] = useState<CustomerData>(() => ({ ...empty, ...initial }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (f: CustomerData) => ({
    companyName: requiredMsg(f.companyName, 'Company name'),
    fullName: requiredMsg(f.fullName, 'Full name'),
    email: emailMsg(f.email, true),
    phone: phoneMsg(f.phone ?? '', true),
    whatsapp: phoneMsg(f.whatsapp ?? '', false, 'WhatsApp number'),
    gstNumber: gstMsg(f.gstNumber ?? ''),
    panNumber: panMsg(f.panNumber ?? ''),
  });
  const invalid = (k: string): React.CSSProperties => (errors[k] ? { borderColor: 'var(--hot)' } : {});

  const set = (k: keyof CustomerData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((p) => (p[k] ? { ...p, [k]: '' } : p));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (!isClean(found)) return;
    setSaving(true);
    try {
      const url = mode === 'add' ? '/api/admin/customers' : `/api/admin/customers/${form._id}`;
      const method = mode === 'add' ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError('Could not save customer', data.error || 'Please try again.'); return; }

      const saved = data.customer as CustomerData;
      // Link the source enquiry to the newly-created customer (best-effort).
      if (mode === 'add' && linkEnquiryId && saved?._id) {
        try {
          await fetch(`/api/enquiries/${linkEnquiryId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: saved._id }),
          });
        } catch { /* non-fatal */ }
      }
      onSaved(saved);
    } catch {
      onError('Network error', 'Could not reach the server while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6 };
  const input: React.CSSProperties = { padding: '10px 14px', fontSize: 14, width: '100%' };

  return (
    <div
      className="animate-fade-in"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 640, padding: 30, position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}
      >
        <button type="button" onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
          {mode === 'add' ? (linkEnquiryId ? 'Convert enquiry to customer' : 'Add customer') : 'Edit customer'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)' }}>Company details</div>
          <div>
            <label style={label}>Company name *</label>
            <input suppressHydrationWarning type="text" value={form.companyName} onChange={set('companyName')} onBlur={() => setErrors((p) => ({ ...p, companyName: requiredMsg(form.companyName, 'Company name') }))} placeholder="Company / factory name" style={{ ...input, ...invalid('companyName') }} aria-invalid={!!errors.companyName} />
            <FieldError message={errors.companyName} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="cust-form-row">
            <div>
              <label style={label}>GST number</label>
              <input suppressHydrationWarning type="text" value={form.gstNumber} onChange={set('gstNumber')} onBlur={() => setErrors((p) => ({ ...p, gstNumber: gstMsg(form.gstNumber ?? '') }))} placeholder="Optional" style={{ ...input, ...invalid('gstNumber') }} aria-invalid={!!errors.gstNumber} />
              <FieldError message={errors.gstNumber} />
            </div>
            <div>
              <label style={label}>PAN number</label>
              <input suppressHydrationWarning type="text" value={form.panNumber} onChange={set('panNumber')} onBlur={() => setErrors((p) => ({ ...p, panNumber: panMsg(form.panNumber ?? '') }))} placeholder="Optional" style={{ ...input, ...invalid('panNumber') }} aria-invalid={!!errors.panNumber} />
              <FieldError message={errors.panNumber} />
            </div>
          </div>
          <div>
            <label style={label}>Company address</label>
            <textarea suppressHydrationWarning rows={2} value={form.companyAddress} onChange={set('companyAddress')} placeholder="Billing / delivery address" style={{ ...input, resize: 'vertical' }} />
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: 4 }}>Contact person</div>
          <div>
            <label style={label}>Full name *</label>
            <input suppressHydrationWarning type="text" value={form.fullName} onChange={set('fullName')} onBlur={() => setErrors((p) => ({ ...p, fullName: requiredMsg(form.fullName, 'Full name') }))} placeholder="Contact person name" style={{ ...input, ...invalid('fullName') }} aria-invalid={!!errors.fullName} />
            <FieldError message={errors.fullName} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="cust-form-row">
            <div>
              <label style={label}>Email ID *</label>
              <input suppressHydrationWarning type="email" value={form.email} onChange={set('email')} onBlur={() => setErrors((p) => ({ ...p, email: emailMsg(form.email, true) }))} placeholder="name@company.com" style={{ ...input, ...invalid('email') }} aria-invalid={!!errors.email} />
              <FieldError message={errors.email} />
            </div>
            <div>
              <label style={label}>Phone number *</label>
              <input suppressHydrationWarning type="tel" value={form.phone} onChange={set('phone')} onBlur={() => setErrors((p) => ({ ...p, phone: phoneMsg(form.phone ?? '', true) }))} placeholder="+91 98765 43210" style={{ ...input, ...invalid('phone') }} aria-invalid={!!errors.phone} />
              <FieldError message={errors.phone} />
            </div>
          </div>
          <div>
            <label style={label}>WhatsApp number</label>
            <input suppressHydrationWarning type="tel" value={form.whatsapp} onChange={set('whatsapp')} onBlur={() => setErrors((p) => ({ ...p, whatsapp: phoneMsg(form.whatsapp ?? '', false, 'WhatsApp number') }))} placeholder="Optional" style={{ ...input, ...invalid('whatsapp') }} aria-invalid={!!errors.whatsapp} />
            <FieldError message={errors.whatsapp} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-light)', paddingTop: 20, marginTop: 6 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: 14 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '10px 24px', fontSize: 14 }}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save customer</>}
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
