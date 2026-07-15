'use client';

import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

/* ============================================================================
   Reusable admin alert / confirmation modal — replaces browser alert()/confirm().
   Styled to match the admin panel (surface cards, tokens, fade-in overlay).

   Usage:
     const { modal, showSuccess, showError, confirm } = useAdminAlert();
     ...
     showSuccess('Category added');
     if (await confirm({ title: 'Delete this?', danger: true })) { ... }
     return <>{modal}{...}</>;
   ========================================================================= */

type Variant = 'success' | 'error' | 'confirm';

export interface ModalState {
  variant: Variant;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

const THEME: Record<Variant, { color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  success: { color: '#1faf52', bg: 'rgba(31,175,82,0.12)', Icon: CheckCircle2 },
  error: { color: 'var(--hot)', bg: 'var(--hot-soft)', Icon: XCircle },
  confirm: { color: 'var(--accent)', bg: 'var(--accent-soft)', Icon: AlertTriangle },
};

export function AdminModal({
  state, onConfirm, onClose,
}: { state: ModalState | null; onConfirm: () => void; onClose: () => void }) {
  if (!state) return null;
  const t = THEME[state.variant];
  const isConfirm = state.variant === 'confirm';

  return (
    <div
      className="animate-fade-in"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'grid', placeItems: 'center', padding: 20, overflowY: 'auto' }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 420, padding: 28, boxShadow: 'var(--shadow-lg)', position: 'relative' }}
      >
        <button
          type="button" onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: '50%', background: t.bg, color: t.color, marginBottom: 18 }}>
          <t.Icon size={28} />
        </div>

        <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', marginBottom: state.message ? 8 : 20, lineHeight: 1.3 }}>
          {state.title}
        </h3>
        {state.message && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24, whiteSpace: 'pre-wrap' }}>{state.message}</p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {isConfirm && (
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: 14 }}>
              {state.cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            type="button"
            onClick={isConfirm ? onConfirm : onClose}
            className="btn"
            style={{ padding: '10px 22px', fontSize: 14, color: '#fff', background: isConfirm ? (state.danger ? 'var(--hot)' : 'var(--accent)') : t.color }}
          >
            {isConfirm ? (state.confirmLabel || 'Confirm') : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Imperative alert/confirm API backed by a single modal instance. */
export function useAdminAlert() {
  const [state, setState] = useState<ModalState | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    setState(null);
    if (resolver.current) { resolver.current(result); resolver.current = null; }
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => setState({ variant: 'success', title, message }), []);
  const showError = useCallback((title: string, message?: string) => setState({ variant: 'error', title, message }), []);
  const confirm = useCallback(
    (opts: { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) => { resolver.current = resolve; setState({ variant: 'confirm', ...opts }); }),
    [],
  );

  const modal = <AdminModal state={state} onConfirm={() => settle(true)} onClose={() => settle(false)} />;
  return { modal, showSuccess, showError, confirm };
}
