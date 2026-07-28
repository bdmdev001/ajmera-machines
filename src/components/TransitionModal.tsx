'use client';

import { useState } from 'react';
import { X, Loader2, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import FieldError from '@/components/FieldError';
import LifecycleStepper from '@/components/LifecycleStepper';
import { stageOf, type LeadRecord, type TransitionDef } from '@/types/crm';

interface Props {
  lead: Pick<LeadRecord, '_id' | 'firstName' | 'lastName' | 'recordType' | 'stage'>;
  def: TransitionDef;
  onClose: () => void;
  onDone: (updated: LeadRecord) => void;
  onError: (title: string, message?: string) => void;
}

/**
 * Confirmation dialog for a lifecycle transition. Captures a required reason
 * (with a free-text explanation required when "Other" is chosen), then calls
 * the transition endpoint. No data is lost — only the workflow stage changes.
 */
export default function TransitionModal({ lead, def, onClose, onDone, onError }: Props) {
  const from = stageOf(lead);
  const back = def.direction === 'back';
  const name = `${lead.firstName} ${lead.lastName}`.trim() || 'this record';

  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<{ reason?: string; comments?: string }>({});

  const isOther = reason === 'Other';

  const submit = async () => {
    const found: { reason?: string; comments?: string } = {};
    if (!reason) found.reason = 'Please select a reason.';
    if (reason === 'Other' && !comments.trim()) found.comments = 'Please add an explanation.';
    setErr(found);
    if (found.reason || found.comments) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/crm/leads/${lead._id}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: def.to, reason, comments: comments.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError('Could not move record', data.error || 'Please try again.'); return; }
      onDone(data.lead as LeadRecord);
    } catch {
      onError('Network error', 'Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };

  return (
    <div className="animate-fade-in" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'grid', placeItems: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 460, padding: 26, position: 'relative', boxShadow: 'var(--shadow-lg)' }}>
        <button type="button" onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>

        <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: '50%', background: back ? 'var(--hot-soft)' : 'var(--accent-soft)', color: back ? 'var(--hot)' : 'var(--accent)', marginBottom: 16 }}>
          {back ? <ArrowLeft size={24} /> : <ArrowRight size={24} />}
        </div>

        <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, lineHeight: 1.3 }}>{def.label}?</h3>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Move <strong style={{ color: 'var(--text-primary)' }}>{name}</strong> from <strong>{from}</strong> to <strong>{def.to}</strong>. All activities, notes, follow-ups and history are kept — only the workflow stage changes.
        </p>

        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', marginBottom: 18 }}>
          <LifecycleStepper stage={def.to} size="sm" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Reason <span style={{ color: 'var(--hot)' }}>*</span></label>
          <select value={reason} onChange={(e) => { setReason(e.target.value); setErr((p) => ({ ...p, reason: '' })); }} aria-invalid={!!err.reason} style={{ fontSize: 14, ...(err.reason ? { borderColor: 'var(--hot)' } : {}) }}>
            <option value="">Select a reason…</option>
            {def.reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <FieldError message={err.reason} />
        </div>

        {isOther && (
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Explanation <span style={{ color: 'var(--hot)' }}>*</span></label>
            <textarea rows={3} value={comments} onChange={(e) => { setComments(e.target.value); setErr((p) => ({ ...p, comments: '' })); }} placeholder="Briefly explain the reason…" aria-invalid={!!err.comments} style={{ fontSize: 14, resize: 'vertical', ...(err.comments ? { borderColor: 'var(--hot)' } : {}) }} />
            <FieldError message={err.comments} />
          </div>
        )}

        {!isOther && (
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Comments (optional)</label>
            <textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add any extra context…" style={{ fontSize: 14, resize: 'vertical' }} />
          </div>
        )}

        {back && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
            <AlertTriangle size={15} style={{ color: 'var(--hot)', flexShrink: 0, marginTop: 1 }} />
            <span>This is a reverse move and will be permanently recorded in the conversion history.</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: 14 }}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 14, background: back ? 'var(--hot)' : undefined }}>
            {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Moving…</> : def.label}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
