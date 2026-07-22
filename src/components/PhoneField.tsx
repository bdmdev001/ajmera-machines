'use client';

import { useEffect, useState } from 'react';
import PhoneInput, { getCountries } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const KNOWN_COUNTRIES = new Set<string>(getCountries());

/** Best-effort country from the browser locale ("en-IN" -> IN). Falls back to
 *  India. Runs only on the client (guarded), so SSR always yields India. */
function detectCountry(): Country {
  if (typeof navigator === 'undefined') return 'IN';
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const m = /[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(l || '');
    if (m) {
      const cc = m[1].toUpperCase();
      if (KNOWN_COUNTRIES.has(cc)) return cc as Country;
    }
  }
  return 'IN';
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  required?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
}

/**
 * International phone / WhatsApp input shared across every form. Renders a
 * country selector (flags + names + dialing codes, all countries), keeps the
 * calling code non-editable, validates per the selected country, and emits the
 * complete number in E.164 (e.g. "+919876543210"). Country auto-detects from
 * the visitor's locale, defaulting to India (+91).
 */
export default function PhoneField({ value, onChange, onBlur, invalid, required, placeholder, ariaLabel, id }: Props) {
  // Default to India on the first (SSR + hydration) render to avoid a mismatch,
  // then upgrade to the detected country if the field is still empty.
  const [defaultCountry, setDefaultCountry] = useState<Country>('IN');
  useEffect(() => {
    if (value) return;
    let active = true;
    // Deferred so the state update happens off the synchronous effect body.
    Promise.resolve().then(() => {
      if (!active) return;
      const c = detectCountry();
      if (c !== 'IN') setDefaultCountry(c);
    });
    return () => { active = false; };
    // Detect once on mount; intentionally not reactive to `value`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PhoneInput
      international
      countryCallingCodeEditable={false}
      defaultCountry={defaultCountry}
      value={value || undefined}
      onChange={(v) => onChange(v ?? '')}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`phone-field${invalid ? ' phone-field--invalid' : ''}`}
      numberInputProps={{
        id,
        suppressHydrationWarning: true,
        'aria-label': ariaLabel,
        'aria-invalid': invalid || undefined,
        'aria-required': required || undefined,
      }}
    />
  );
}
