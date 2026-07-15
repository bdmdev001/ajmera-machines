'use client';

import { useCallback, useEffect, useState } from 'react';
import { Share2, Loader2, Check, AlertCircle } from 'lucide-react';
import { generateBrochure } from '@/components/pdf/generateBrochure';
import type { BrochureData } from '@/components/pdf/brochure';
import { sanitizeFileName } from '@/components/pdf/assets';

/* ------------------------------------------------------------------ *
 * Share Product — builds a premium A4 PDF brochure entirely on the
 * client (vector jsPDF, images preloaded & embedded), then shares it
 * via the Web Share API or falls back to download + copy-link.
 * No backend / API involvement.
 * ------------------------------------------------------------------ */

interface ShareSpec { label: string; value: string }

export interface ShareProductProps {
  product: {
    id: string;
    title: string;
    stockNo: string;
    category: string;
    make: string;
    model: string;
    year?: string;
    country: string;
    condition: string;
    availability: string;
  };
  description: string;
  specs: ShareSpec[];
  notes: string[];
  features: string[];
  applications: string[];
  images: string[]; // absolute srcs, e.g. /machines/1024_1.jpg
}

/* Production site URL — never leak localhost into the brochure/QR.
   Override per-environment via NEXT_PUBLIC_SITE_URL. */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ajmeramachines.com').replace(/\/+$/, '');

function siteHost(): string {
  try { return new URL(SITE_URL).host; } catch { return SITE_URL.replace(/^https?:\/\//, ''); }
}

const COMPANY = {
  name: 'Ajmera Enterprise',
  tagline: 'Quality used engineering & CNC machinery since 1990',
  phone: '+91 93224 01398',
  email: 'ajmeraenterprise@gmail.com',
  website: siteHost(),
  address: 'Plot R-258, MIDC, TTC Industrial Area, Rabale, Navi Mumbai 400701, India',
  // Tightly-cropped, full-resolution wordmark for print — the source PNG has
  // ~50% transparent vertical padding that made the mark look small in the PDF.
  logoSrc: '/ajmera-logo-pdf.png',
};

type ToastKind = 'success' | 'error';

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function ShareProduct({ product, description, specs, notes, features, applications, images }: ShareProductProps) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  const fileName = useCallback(() => {
    const base = sanitizeFileName(product.title) || 'Machine';
    return `${base}-Stock-${sanitizeFileName(product.stockNo) || 'NA'}.pdf`;
  }, [product.title, product.stockNo]);

  const buildData = useCallback((): BrochureData => ({
    company: {
      name: COMPANY.name,
      tagline: COMPANY.tagline,
      phone: COMPANY.phone,
      email: COMPANY.email,
      website: COMPANY.website,
      address: COMPANY.address,
    },
    product: {
      title: product.title,
      category: product.category,
      make: product.make,
      model: product.model,
      year: product.year,
      country: product.country,
      stockNo: product.stockNo,
      condition: product.condition,
      availability: product.availability,
    },
    description,
    specs,
    notes,
    features,
    applications,
    productUrl: `${SITE_URL}/products/${product.id}`,
    generatedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  }), [product, description, specs, notes, features, applications]);

  const handleShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const data = buildData();
    const name = fileName();
    const shareText = `${product.title} — Stock ${product.stockNo}`;
    try {
      const blob = await generateBrochure(data, { logoSrc: COMPANY.logoSrc, imageSrcs: images });
      const file = new File([blob], name, { type: 'application/pdf' });
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      const canFiles = !!nav.canShare && nav.canShare({ files: [file] });

      if (typeof nav.share === 'function') {
        try {
          if (canFiles) {
            await nav.share({ files: [file], title: product.title, text: shareText, url: data.productUrl });
            setToast({ kind: 'success', msg: 'Brochure shared' });
          } else {
            await nav.share({ title: product.title, text: shareText, url: data.productUrl });
            downloadBlob(blob, name);
            setToast({ kind: 'success', msg: 'Link shared · brochure downloaded' });
          }
          return;
        } catch (err) {
          if (isAbortError(err)) return;
          // fall through to download + copy
        }
      }

      downloadBlob(blob, name);
      const copied = await copyToClipboard(data.productUrl);
      setToast({ kind: 'success', msg: copied ? 'Brochure downloaded · link copied' : 'Brochure downloaded' });
    } catch (err) {
      console.error('[ShareProduct]', err);
      setToast({ kind: 'error', msg: 'Could not create the brochure' });
    } finally {
      setBusy(false);
    }
  }, [busy, buildData, fileName, product.title, product.stockNo, images]);

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        aria-busy={busy}
        className="btn btn-secondary"
        style={{ width: '100%', opacity: busy ? 0.75 : 1, cursor: busy ? 'progress' : 'pointer' }}
      >
        {busy
          ? <><Loader2 size={17} className="share-spin" /> Preparing…</>
          : <><Share2 size={17} /> Share</>}
      </button>

      {toast && (
        <div role="status" aria-live="polite" className="share-toast">
          <span
            style={{
              display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: toast.kind === 'success' ? 'var(--accent)' : 'var(--hot)', color: '#fff',
            }}
          >
            {toast.kind === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          </span>
          {toast.msg}
        </div>
      )}
    </>
  );
}
