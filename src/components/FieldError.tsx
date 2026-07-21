import { AlertCircle } from 'lucide-react';

/* Inline, responsive field-level error message shared by every form.
   Renders nothing when there is no error, so it can be dropped under any input. */
export default function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 5,
        fontSize: 12,
        lineHeight: 1.35,
        color: 'var(--hot)',
        marginTop: 2,
      }}
    >
      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{message}</span>
    </span>
  );
}
