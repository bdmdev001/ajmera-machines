import nodemailer, { type Transporter } from 'nodemailer';

/* ============================================================================
   Nodemailer (SMTP) — all config from .env. Never throws to the caller: mail is
   best-effort so an enquiry is still saved even when email fails.
     MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM, ADMIN_EMAIL
   ========================================================================= */

let cached: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);
}

function getTransporter(): Transporter | null {
  if (cached) return cached;
  if (!isMailConfigured()) return null;
  const port = Number(process.env.MAIL_PORT || 587);
  cached = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    secure: port === 465, // implicit TLS on 465; STARTTLS on 587/others
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
  return cached;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ajmeramachines.com').replace(/\/+$/, '');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
));

export interface EnquiryMail {
  name: string;
  email: string;
  phone: string;
  company?: string;
  message: string;
  productTitle?: string;
  stockNo?: string;
  productId?: string;
}

/** Send the admin an email about a new enquiry. Returns a result, never throws. */
export async function sendEnquiryNotification(data: EnquiryMail): Promise<{ sent: boolean; error?: string }> {
  const transporter = getTransporter();
  const to = process.env.ADMIN_EMAIL || process.env.MAIL_USER;
  if (!transporter || !to) return { sent: false, error: 'Mail is not configured (MAIL_* / ADMIN_EMAIL missing)' };

  const from = process.env.MAIL_FROM || `Ajmera Website <${process.env.MAIL_USER}>`;
  const isProduct = Boolean(data.productTitle || data.stockNo);
  const subject = isProduct
    ? `New product enquiry — ${data.productTitle || 'Machine'}${data.stockNo ? ` (${data.stockNo})` : ''}`
    : `New contact enquiry from ${data.name}`;

  const rows: [string, string][] = [
    ['Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone],
  ];
  if (data.company) rows.push(['Company', data.company]);
  if (isProduct) rows.push(['Machine', `${data.productTitle || ''}${data.stockNo ? ` (Stock ${data.stockNo})` : ''}`.trim()]);
  if (data.productId) rows.push(['Link', `${SITE_URL}/products/${data.productId}`]);

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#111">
      <h2 style="color:#175C8A;margin:0 0 16px">${isProduct ? 'New Product Enquiry' : 'New Contact Enquiry'}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows.map(([k, v]) => `<tr>
          <td style="padding:8px 10px;background:#f3f6f9;font-weight:700;border:1px solid #e6e9ee;width:120px">${esc(k)}</td>
          <td style="padding:8px 10px;border:1px solid #e6e9ee">${esc(v)}</td></tr>`).join('')}
      </table>
      <h3 style="margin:20px 0 6px;font-size:14px;color:#566072">Message</h3>
      <p style="white-space:pre-wrap;font-size:14px;background:#f8f9fb;border:1px solid #e6e9ee;padding:12px;border-radius:6px">${esc(data.message)}</p>
      <p style="font-size:12px;color:#93a0af;margin-top:20px">Sent automatically from the Ajmera Enterprise website.</p>
    </div>`;

  const text = [
    subject, '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '', 'Message:', data.message,
  ].join('\n');

  try {
    await transporter.sendMail({ from, to, replyTo: data.email, subject, text, html });
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}
