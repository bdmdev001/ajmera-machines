'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Send, CheckCircle2, Loader2, ArrowRight, Package } from 'lucide-react';

interface EnquiryFormProps {
  productId?: string;
  productTitle?: string;
  stockNo?: string;
}

const CONTACT_TIMES = ['Any time', 'Morning (10am–1pm)', 'Afternoon (1pm–4pm)', 'Evening (4pm–6:30pm)'];

export default function EnquiryForm({ productId, productTitle, stockNo }: EnquiryFormProps) {
  const hasProduct = !!(productTitle || stockNo);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [preferred, setPreferred] = useState(CONTACT_TIMES[0]);
  const [message, setMessage] = useState(
    hasProduct
      ? `I'm interested in ${productTitle ?? 'this machine'}${stockNo ? ` (Stock ${stockNo})` : ''}. Please send me the best price, condition photos and full specifications.`
      : ''
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const composedMessage = `${message}\n\n— Quantity required: ${quantity}\n— Preferred contact time: ${preferred}`;

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, productTitle, stockNo, name, email, phone, company, message: composedMessage }),
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
          <input suppressHydrationWarning type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="enquiry-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={fieldLabel}>Email *</label>
            <input suppressHydrationWarning type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={fieldLabel}>Phone / WhatsApp *</label>
            <input suppressHydrationWarning type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
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
          <label style={fieldLabel}>Preferred contact time</label>
          <select suppressHydrationWarning value={preferred} onChange={(e) => setPreferred(e.target.value)}>
            {CONTACT_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={fieldLabel}>Message *</label>
          <textarea suppressHydrationWarning required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what you need…" style={{ resize: 'vertical' }} />
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
