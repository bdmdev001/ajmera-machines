/* ============================================================================
   Shared, dependency-free form validators used by BOTH client forms and the
   API routes, so front-end and server-side validation stay in lock-step.

   Every field-level helper returns an error string, or '' when the value is
   valid. Optional fields validate their FORMAT only when a value is present.
   ========================================================================= */

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

/* ------------------------------------------------------------------ */
/* Phone numbers                                                       */
/*                                                                     */
/* A number is a country calling code of up to 4 digits followed by a  */
/* national (subscriber) number of up to 15 digits, so a full E.164-   */
/* style value carries at most 19 digits. Validation is deliberately   */
/* length-based rather than per-country (libphonenumber-js): the CRM   */
/* holds international numbers whose national plans we don't track, and*/
/* a strict per-country check rejected legitimate long numbers.        */
/* ------------------------------------------------------------------ */

export const MAX_COUNTRY_CODE_DIGITS = 4;
export const MAX_PHONE_DIGITS = 15;
/** Shortest complete number (code + national digits) we accept. */
export const MIN_PHONE_DIGITS = 5;

// Digits plus the usual separators; an optional "+" may only lead.
const PHONE_CHARS_RE = /^\+?[\d\s()./-]+$/;

/** Digits only — drops "+", spaces, brackets and dashes. */
export function phoneDigits(v: string): string {
  return String(v ?? '').replace(/\D/g, '');
}

/** Country calling code on its own, with or without "+" (e.g. "91", "+1242"). */
export function isValidCountryCode(v: string): boolean {
  const s = v.trim();
  if (!s || !PHONE_CHARS_RE.test(s)) return false;
  const d = phoneDigits(s);
  return d.length >= 1 && d.length <= MAX_COUNTRY_CODE_DIGITS;
}

/** National number on its own, i.e. the part after the country code. Only the
 *  upper bound is enforced here — a short national number is fine behind a
 *  calling code, so the floor is checked on the complete number by
 *  isValidPhone(). A value that already carries "+" is a complete number. */
export function isValidNationalNumber(v: string): boolean {
  const s = v.trim();
  if (!s || !PHONE_CHARS_RE.test(s)) return false;
  if (s.startsWith('+')) return isValidPhone(s);
  const d = phoneDigits(s);
  return d.length >= 1 && d.length <= MAX_PHONE_DIGITS;
}

/** Longest value accepted for a complete number — with a leading "+" the
 *  country code and the national number stack. */
function maxDigitsFor(s: string): number {
  return s.startsWith('+') ? MAX_COUNTRY_CODE_DIGITS + MAX_PHONE_DIGITS : MAX_PHONE_DIGITS;
}

/** Phone / WhatsApp. Forms submit E.164 (e.g. "+919876543210"); bare national
 *  numbers (legacy stored values, import cells with no country code) are also
 *  accepted. */
export function isValidPhone(v: string): boolean {
  const s = v.trim();
  if (!s || !PHONE_CHARS_RE.test(s)) return false;
  const d = phoneDigits(s);
  return d.length >= MIN_PHONE_DIGITS && d.length <= maxDigitsFor(s);
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
