/* ============================================================================
   Shared, dependency-free form validators used by BOTH client forms and the
   API routes, so front-end and server-side validation stay in lock-step.

   Every field-level helper returns an error string, or '' when the value is
   valid. Optional fields validate their FORMAT only when a value is present.
   ========================================================================= */

import { isValidPhoneNumber } from 'libphonenumber-js';

// Email — pragmatic RFC-ish check (also used by the subscribe route).
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Indian GSTIN — 15 chars: 2 state digits, 5 PAN letters, 4 digits, 1 letter,
// 1 entity char, the fixed "Z", 1 checksum char.
export const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
// Indian PAN — 5 letters, 4 digits, 1 letter.
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

/** Phone / WhatsApp. Forms now submit E.164 (e.g. "+919876543210"), which we
 *  validate per-country via libphonenumber-js. A digit-count fallback keeps any
 *  pre-existing, non-E.164 stored values from being rejected. */
export function isValidPhone(v: string): boolean {
  const s = v.trim();
  if (!s) return false;
  if (s.startsWith('+')) return isValidPhoneNumber(s);
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidGST(v: string): boolean {
  return GST_RE.test(v.trim().toUpperCase());
}

export function isValidPAN(v: string): boolean {
  return PAN_RE.test(v.trim().toUpperCase());
}

export function isValidUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 4-digit manufacturing year between 1900 and next year. */
export function isValidYear(v: string): boolean {
  if (!/^\d{4}$/.test(v.trim())) return false;
  const y = Number(v);
  return y >= 1900 && y <= new Date().getFullYear() + 1;
}

/* ------------------------------------------------------------------ */
/* Field-level message helpers — return '' when valid.                */
/* ------------------------------------------------------------------ */

export function requiredMsg(value: string, label: string): string {
  return value.trim() ? '' : `${label} is required.`;
}

export function emailMsg(value: string, required = false): string {
  const v = value.trim();
  if (!v) return required ? 'Email is required.' : '';
  return isValidEmail(v) ? '' : 'Enter a valid email address.';
}

export function phoneMsg(value: string, required = false, label = 'Phone number'): string {
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : '';
  return isValidPhone(v) ? '' : `Enter a valid ${label.toLowerCase()}.`;
}

export function gstMsg(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return isValidGST(v) ? '' : 'Enter a valid 15-character GST number (e.g. 27ABCDE1234F1Z5).';
}

export function panMsg(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return isValidPAN(v) ? '' : 'Enter a valid 10-character PAN (e.g. ABCDE1234F).';
}

export function urlMsg(value: string, required = false, label = 'URL'): string {
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : '';
  return isValidUrl(v) ? '' : `Enter a valid ${label} starting with http:// or https://.`;
}

export function yearMsg(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return isValidYear(v) ? '' : 'Enter a valid 4-digit year.';
}

/** True when every value in the map is '' (no errors). */
export function isClean(errors: Record<string, string>): boolean {
  return Object.values(errors).every((e) => !e);
}
