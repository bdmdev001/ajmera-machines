'use client';

import { useId, useState } from 'react';

/* ============================================================================
   "Go to page" input — sits beside the prev/next controls in every paginated
   admin listing (Inventory, Enquiries, Leads & Customers, Customers,
   Subscribers) so a long list doesn't have to be walked a page at a time.

   The caller owns the page state, so jumping keeps whatever search, filters and
   sort are already applied — this only hands back a validated page number.
   Out-of-range values (0, negatives, past the last page) and anything that
   isn't a whole number are refused with an inline message instead of
   navigating.
   ========================================================================= */

interface Props {
  /** Total number of pages currently available under the active filters. */
  totalPages: number;
  /** Called with a validated page number in 1…totalPages. */
  onGo: (page: number) => void;
  disabled?: boolean;
}

export default function PageJump({ totalPages, onGo, disabled }: Props) {
  const id = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const raw = value.trim();
    const n = Number(raw);
    if (!raw || !/^\d+$/.test(raw) || !Number.isInteger(n) || n < 1 || n > totalPages) {
      setError(`Enter a page between 1 and ${totalPages}.`);
      return;
    }
    setError('');
    setValue('');
    onGo(n);
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <label htmlFor={id} style={{ fontSize: 13, color: 'var(--text-muted)' }}>Go to</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={value}
        disabled={disabled}
        placeholder={`1–${totalPages}`}
        onChange={(e) => { setValue(e.target.value); if (error) setError(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
        aria-label={`Go to page (1 to ${totalPages})`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        style={{
          width: 78, height: 36, padding: '0 8px', fontSize: 13, fontWeight: 600,
          textAlign: 'center', borderRadius: 'var(--radius-sm)',
          border: `1px solid ${error ? 'var(--hot)' : 'var(--border-light)'}`,
          background: 'var(--bg-surface)', color: 'var(--text-primary)',
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        aria-label="Go to page"
        style={{
          height: 36, padding: '0 14px', fontFamily: 'var(--font-display)', fontWeight: 600,
          fontSize: 13.5, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)',
          background: 'var(--bg-surface)', color: 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        }}
      >
        Go
      </button>
      {error && (
        <span id={`${id}-err`} role="alert" style={{ fontSize: 12, color: 'var(--hot)' }}>{error}</span>
      )}
    </div>
  );
}
