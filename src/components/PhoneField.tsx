'use client';

import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
 * complete number in E.164 (e.g. "+919876543210"). Defaults to India (+91) — the
 * visitor can still switch to any country from the selector.
 */
export default function PhoneField({ value, onChange, onBlur, invalid, required, placeholder, ariaLabel, id }: Props) {
  return (
    <PhoneInput
      international
      countryCallingCodeEditable={false}
      defaultCountry="IN"
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
