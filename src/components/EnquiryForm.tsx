'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Send, CheckCircle2, Loader2, ArrowRight, Package } from 'lucide-react';
import FieldError from '@/components/FieldError';
import PhoneField from '@/components/PhoneField';
import { requiredMsg, emailMsg, phoneMsg, gstMsg, panMsg, isClean } from '@/lib/validation';

interface EnquiryFormProps {
  productId?: string;
  productTitle?: string;
  stockNo?: string;
  /** Pre-filled message body, e.g. a requirement carried from the product-list
   *  "no results" state (category + selected specifications). */
  initialMessage?: string;
}

export default function EnquiryForm({ productId, productTitle, stockNo, initialMessage }: EnquiryFormProps) {
  const hasProduct = !!(productTitle || stockNo);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [message, setMessage] = useState(
    initialMessage
      ? initialMessage
      : hasProduct
        ? `I'm interested in ${productTitle ?? 'this machine'}${stockNo ? ` (Stock ${stockNo})` : ''}. Please send me the best price, condition photos and full specifications.`
        : ''
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => ({
    name: requiredMsg(name, 'Full name'),
    email: emailMsg(email, true),
    phone: phoneMsg(phone, true, 'Phone / WhatsApp'),
    companyAddress: requiredMsg(companyAddress, 'Company address'),
    gstNumber: gstMsg(gstNumber),
    panNumber: panMsg(panNumber),
    message: requiredMsg(message, 'Message'),
  });
  const clearError = (k: string) => setErrors((p) => (p[k] ? { ...p, [k]: '' } : p));
  const invalid = (k: string): React.CSSProperties => (errors[k] ? { borderColor: 'var(--hot)' } : {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found = validate();
    setErrors(found);
    if (!isClean(found)) { setStatus('idle'); return; }

    setStatus('loading');
    setErrorMsg('');

    const composedMessage = `${message}\n\n— Quantity required: ${quantity}`;

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, productTitle, stockNo, name, email, phone, company, companyAddress, gstNumber, panNumber, message: composedMessage }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Failed to submit enquiry. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('A network error occurred. Please check your connection.');
    }
  };

  if (status === 'success') {
    return (
      <div className="surface animate-fade-in" style={{ padding: '48px 32px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(37,211,102,0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <CheckCircle2 size={36} style={{ color: '#1faf52' }} />
        </div>
        <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Enquiry sent — thank you!</h3>
        <p style={{ fontSize: 15, maxWidth: 380, margin: '0 auto 8px' }}>
          We&apos;ve received your enquiry{stockNo ? <> for <strong style={{ color: 'var(--text-primary)' }}>Stock {stockNo}</strong></> : ''} and
          our team will reply with the best price, usually within a few working hours.
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 28 }}>Prefer to talk now? Message us on WhatsApp for an instant response.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/products" className="btn btn-primary">Browse more machines <ArrowRight size={16} /></Link>
          <a href="https://api.whatsapp.com/send?phone=919322401398" target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">WhatsApp us</a>
        </div>
      </div>
    );
  }

  const fieldLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' };

  return (
    <div className="surface" style={{ padding: 'clamp(24px, 3vw, 34px)', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 6 }}>{hasProduct ? 'Request best price' : 'Send an enquiry'}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: hasProduct ? 18 : 24 }}>
        Fill this in and our machinery specialists reply within a few working hours.
      </p>

      {hasProduct && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)', border: '1px solid var(--border-glow)', marginBottom: 22 }}>
          <Package size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enquiring about</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {productTitle}{stockNo ? ` · ${stockNo}` : ''}
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ background: 'var(--hot-soft)', border: '1px solid rgba(236,68,51,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13, color: 'var(--hot)', marginBottom: 20 }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={fieldLabel}>Full name *</label>
          <input suppressHydrationWarning type="text" value={name} onChange={(e) => { setName(e.target.value); clearError('name'); }} onBlur={() => setErrors((p) => ({ ...p, name: requiredMsg(name, 'Full name') }))} placeholder="Your name" style={invalid('name')} aria-invalid={!!errors.name} />
          <FieldError message={errors.name} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="enquiry-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={fieldLabel}>Email *</label>
            <input suppressHydrationWarning type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }} onBlur={() => setErrors((p) => ({ ...p, email: emailMsg(email, true) }))} placeholder="you@company.com" style={invalid('email')} aria-invalid={!!errors.email} />
            <FieldError message={errors.email} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={fieldLabel}>Phone / WhatsApp *</label>
            <PhoneField value={phone} onChange={(v) => { setPhone(v); clearError('phone'); }} onBlur={() => setErrors((p) => ({ ...p, phone: phoneMsg(phone, true, 'Phone / WhatsApp') }))} invalid={!!errors.phone} required ariaLabel="Phone / WhatsApp" />
            <FieldError message={errors.phone} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }} className="enquiry-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={fieldLabel}>Company</label>
            <input suppressHydrationWarning type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company / factory name" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={fieldLabel}>Quantity</label>
            <input suppressHydrationWarning type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={fieldLabel}>Company address *</label>
          <textarea suppressHydrationWarning rows={2} value={companyAddress} onChange={(e) => { setCompanyAddress(e.target.value); clearError('companyAddress'); }} onBlur={() => setErrors((p) => ({ ...p, companyAddress: requiredMsg(companyAddress, 'Company address') }))} placeholder="Billing / delivery address" style={{ resize: 'vertical', ...invalid('companyAddress') }} aria-invalid={!!errors.companyAddress} />
          <FieldError message={errors.companyAddress} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="enquiry-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={fieldLabel}>GST number</label>
            <input suppressHydrationWarning type="text" value={gstNumber} onChange={(e) => { setGstNumber(e.target.value); clearError('gstNumber'); }} onBlur={() => setErrors((p) => ({ ...p, gstNumber: gstMsg(gstNumber) }))} placeholder="Optional" style={invalid('gstNumber')} aria-invalid={!!errors.gstNumber} />
            <FieldError message={errors.gstNumber} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={fieldLabel}>PAN number</label>
            <input suppressHydrationWarning type="text" value={panNumber} onChange={(e) => { setPanNumber(e.target.value); clearError('panNumber'); }} onBlur={() => setErrors((p) => ({ ...p, panNumber: panMsg(panNumber) }))} placeholder="Optional" style={invalid('panNumber')} aria-invalid={!!errors.panNumber} />
            <FieldError message={errors.panNumber} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={fieldLabel}>Message *</label>
          <textarea suppressHydrationWarning rows={4} value={message} onChange={(e) => { setMessage(e.target.value); clearError('message'); }} onBlur={() => setErrors((p) => ({ ...p, message: requiredMsg(message, 'Message') }))} placeholder="Tell us what you need…" style={{ resize: 'vertical', ...invalid('message') }} aria-invalid={!!errors.message} />
          <FieldError message={errors.message} />
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={status === 'loading'} style={{ justifyContent: 'center' }}>
          {status === 'loading'
            ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
            : <><Send size={17} /> Submit enquiry</>}
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No spam. Your details are used only to answer your enquiry.</p>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
