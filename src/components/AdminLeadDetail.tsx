'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Phone, MessageCircle, Edit3, UserCheck, Loader2,
  Building2, MapPin, Tag as TagIcon, StickyNote, CalendarClock, Plus, Check,
  Trash2, Clock, PhoneCall, Users, FileText, ArrowRightLeft, ListChecks, ShoppingBag, X,
} from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';
import LeadFormModal from '@/components/LeadFormModal';
import LifecycleStepper from '@/components/LifecycleStepper';
import TransitionModal from '@/components/TransitionModal';
import { useCrmLists } from '@/hooks/useCrmLists';
import {
  colorFor, stageOf, TRANSITIONS,
  type LeadRecord, type ActivityRecord, type ActivityType, type Purchase,
  type ConversionLogEntry, type TransitionDef,
} from '@/types/crm';

interface RelatedEnquiry {
  _id: string; productTitle: string; stockNo: string; message: string; status: string; createdAt: string | null;
}

const STAGE_INDEX: Record<string, number> = { Enquiry: 0, Lead: 1, Customer: 2 };

const ACTIVITY_META: Record<ActivityType, { label: string; icon: typeof Clock; color: string }> = {
  note: { label: 'Note', icon: StickyNote, color: '#64748b' },
  call: { label: 'Call', icon: PhoneCall, color: '#0ea5e9' },
  email: { label: 'Email', icon: Mail, color: '#8b5cf6' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#1faf52' },
  meeting: { label: 'Meeting', icon: Users, color: '#f59e0b' },
  'follow-up': { label: 'Follow-up', icon: CalendarClock, color: '#f97316' },
  'stage-change': { label: 'Stage change', icon: ArrowRightLeft, color: '#3b82f6' },
  created: { label: 'Created', icon: Plus, color: '#94a3b8' },
  converted: { label: 'Converted', icon: UserCheck, color: '#1faf52' },
};

const COMPOSER_TYPES: ActivityType[] = ['note', 'call', 'email', 'whatsapp', 'meeting', 'follow-up'];

function fmt(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}), timeZone: 'Asia/Kolkata' });
}
function digits(s: string): string { return (s || '').replace(/[^\d+]/g, ''); }

export default function AdminLeadDetail({ id }: { id: string }) {
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [enquiries, setEnquiries] = useState<RelatedEnquiry[]>([]);
  const [conversionLogs, setConversionLogs] = useState<ConversionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transition, setTransition] = useState<TransitionDef | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { lists } = useCrmLists();
  const { modal, showSuccess, showError, confirm } = useAdminAlert();

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/crm/leads/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) { showError('Could not load record', data.error || 'Please try again.'); return; }
        setLead(data.lead);
        setActivities(data.activities || []);
        setEnquiries(data.enquiries || []);
        setConversionLogs(data.conversionLogs || []);
      } catch { if (!cancelled) showError('Network error', 'Could not reach the server.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id, refreshKey, showError]);

  const name = useMemo(() => lead ? `${lead.firstName} ${lead.lastName}`.trim() || lead.email : '', [lead]);

  const onTransitionDone = (updated: LeadRecord) => {
    setTransition(null);
    setLead(updated);
    showSuccess('Record moved', `“${name}” is now at the ${updated.stage} stage.`);
    reload(); // refresh timeline + conversion history
  };

  const addActivity = async (payload: { type: ActivityType; title: string; body: string; dueAt?: string }) => {
    const res = await fetch(`/api/admin/crm/leads/${id}/activities`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showError('Could not add activity', data.error || 'Please try again.'); return false; }
    setActivities((a) => [data.activity, ...a]);
    if (payload.type === 'follow-up' && payload.dueAt) reload(); // refresh nextFollowUp
    return true;
  };

  const toggleDone = async (act: ActivityRecord) => {
    const res = await fetch(`/api/admin/crm/leads/${id}/activities/${act._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !act.done }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showError('Could not update', data.error); return; }
    setActivities((list) => list.map((a) => (a._id === act._id ? data.activity : a)));
    if (act.type === 'follow-up') reload();
  };

  const deleteActivity = async (act: ActivityRecord) => {
    const ok = await confirm({ title: 'Delete this activity?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const res = await fetch(`/api/admin/crm/leads/${id}/activities/${act._id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError('Could not delete', d.error); return; }
    setActivities((list) => list.filter((a) => a._id !== act._id));
  };

  const editActivity = async (actId: string, patch: { title: string; body: string }): Promise<boolean> => {
    const res = await fetch(`/api/admin/crm/leads/${id}/activities/${actId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showError('Could not update activity', data.error || 'Please try again.'); return false; }
    setActivities((list) => list.map((a) => (a._id === actId ? data.activity : a)));
    return true;
  };

  // Save the full record with a new `purchases` array (customer stage).
  const savePurchases = async (next: Purchase[]): Promise<boolean> => {
    if (!lead) return false;
    const res = await fetch(`/api/admin/crm/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...lead, purchases: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showError('Could not save purchase', data.error || 'Please try again.'); return false; }
    setLead(data.lead);
    return true;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /><div style={{ marginTop: 10 }}>Loading record…</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  }
  if (notFound || !lead) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 16 }}>This record could not be found.</p>
        <Link href="/admin/leads" className="btn btn-primary"><ArrowLeft size={15} /> Back to Leads &amp; Customers</Link>
      </div>
    );
  }

  const isCust = lead.recordType === 'Customer';
  const stage = stageOf(lead);
  const actions: TransitionDef[] = TRANSITIONS[stage];
  const formerCustomer = stage !== 'Customer' && !!lead.convertedAt;
  const wa = digits(lead.whatsapp || lead.mobile);
  const addressParts = [lead.addressLine1, lead.addressLine2, lead.city, lead.state, lead.country, lead.zip].filter(Boolean);

  return (
    <div style={{ paddingBottom: 40 }}>
      {modal}
      {editOpen && (
        <LeadFormModal mode="edit" initial={lead} defaultRecordType={lead.recordType}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => { setEditOpen(false); setLead(saved); showSuccess('Record updated', `“${`${saved.firstName} ${saved.lastName}`.trim()}” has been saved.`); reload(); }}
          onError={showError} />
      )}
      {transition && (
        <TransitionModal lead={lead} def={transition} onClose={() => setTransition(null)} onDone={onTransitionDone} onError={showError} />
      )}

      <Link href="/admin/leads" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 18 }}><ArrowLeft size={15} /> Leads &amp; Customers</Link>

      {/* Header card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 16, minWidth: 0 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: 16, background: isCust ? 'rgba(31,175,82,0.12)' : 'var(--accent-soft)', color: isCust ? '#1faf52' : 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
              {(lead.firstName[0] || lead.email[0] || '?').toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="display" style={{ fontSize: 24, lineHeight: 1.1 }}>{name}</h1>
                {formerCustomer && (
                  <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 11.5, fontWeight: 700, background: 'var(--hot-soft)', color: 'var(--hot)' }}>Former customer</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{[lead.designation, lead.organisation].filter(Boolean).join(' · ') || '—'}</p>
              <div style={{ marginTop: 12 }}><LifecycleStepper stage={stage} /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {lead.leadStage && <Chip label={lead.leadStage} color={colorFor(lists.leadStage, lead.leadStage)} />}
                {lead.leadPotential && <Chip label={lead.leadPotential} color={colorFor(lists.leadPotential, lead.leadPotential)} />}
                {lead.customerGroup && <Chip label={lead.customerGroup} color="#64748b" />}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={`mailto:${lead.email}`} className="btn btn-secondary btn-sm" title="Email"><Mail size={15} /></a>
            <a href={`tel:${digits(lead.mobile)}`} className="btn btn-secondary btn-sm" title="Call"><Phone size={15} /></a>
            {wa && <a href={`https://wa.me/${wa.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" title="WhatsApp"><MessageCircle size={15} /></a>}
            <button onClick={() => setEditOpen(true)} className="btn btn-secondary btn-sm"><Edit3 size={15} /> Edit</button>
            {actions.map((def) => (
              <button key={def.to} onClick={() => setTransition(def)} className={`btn btn-sm ${def.direction === 'forward' ? 'btn-primary' : 'btn-secondary'}`}>
                {def.direction === 'forward' ? <UserCheck size={15} /> : <ArrowLeft size={15} />} {def.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lead-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, alignItems: 'start' }}>
        {/* LEFT: profile data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Section icon={Mail} title="Contact">
            <Rows rows={[
              ['Email', lead.email], ['Mobile', lead.mobile], ['WhatsApp', lead.whatsapp],
              ['Website', lead.website], ['Telephone (Direct)', lead.telephoneDirect], ['Telephone (Office)', lead.telephoneOffice],
            ]} />
          </Section>

          <Section icon={Building2} title="Organisation">
            <Rows rows={[
              ['Organisation', lead.organisation], ['Designation', lead.designation],
              ['GST number', lead.gstNumber], ['PAN number', lead.panNumber], ['List name', lead.listName],
            ]} />
          </Section>

          {addressParts.length > 0 && (
            <Section icon={MapPin} title="Address">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{addressParts.join(', ')}</p>
            </Section>
          )}

          <Section icon={ListChecks} title="Qualification">
            <Rows rows={[
              ['Lead stage', lead.leadStage], ['Lead potential', lead.leadPotential],
              ['Assigned to', lead.assignedTo], ['Expected deal value', lead.dealSize],
              ['Customer group', lead.customerGroup],
              ['Interested products', lead.interestedProducts.join(', ')],
              ['Product groups', lead.productGroups.join(', ')],
            ]} />
            {lead.requirementDetails && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Requirement details</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lead.requirementDetails}</p>
              </div>
            )}
            {lead.tags.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}><TagIcon size={13} /> Tags</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {lead.tags.map((t) => <Chip key={t} label={t} color="var(--accent)" />)}
                </div>
              </div>
            )}
            {lead.customFields.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Rows rows={lead.customFields.map((c) => [c.label || '—', c.value] as [string, string])} />
              </div>
            )}
          </Section>

          {lead.notes && (
            <Section icon={StickyNote} title="Notes">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lead.notes}</p>
            </Section>
          )}

          {isCust && (
            <Section icon={ShoppingBag} title="Purchase history">
              <PurchaseManager purchases={lead.purchases} onSave={savePurchases} />
            </Section>
          )}

          {enquiries.length > 0 && (
            <Section icon={FileText} title={`Related enquiries (${enquiries.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {enquiries.map((e) => (
                  <div key={e._id} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{e.productTitle || 'General enquiry'}{e.stockNo ? ` · ${e.stockNo}` : ''}</div>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(e.createdAt, false)}</span>
                    </div>
                    {e.message && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{e.message}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {conversionLogs.length > 0 && (
            <Section icon={ArrowRightLeft} title={`Conversion history (${conversionLogs.length})`}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Permanent audit trail — cannot be edited or deleted.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {conversionLogs.map((l) => {
                  const back = STAGE_INDEX[l.toStage] < STAGE_INDEX[l.fromStage];
                  return (
                    <div key={l._id} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 12, borderLeft: `3px solid ${back ? 'var(--hot)' : '#1faf52'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{l.fromStage} <span style={{ color: 'var(--text-muted)' }}>→</span> {l.toStage}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(l.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Reason: {l.reason}{l.comments ? ` — ${l.comments}` : ''}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>by {l.admin}</div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {/* RIGHT: follow-up + activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {lead.nextFollowUpAt && (
            <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <CalendarClock size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent)' }}>Next follow-up</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{fmt(lead.nextFollowUpAt)}</div>
                {lead.nextFollowUpNote && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{lead.nextFollowUpNote}</div>}
              </div>
            </div>
          )}

          <Section icon={Clock} title="Activity &amp; follow-ups">
            <ActivityComposer onAdd={addActivity} />
            {activities.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No activity yet. Log a call, note, or schedule a follow-up above.</p>
            ) : (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column' }}>
                {activities.map((a, i) => (
                  <ActivityItem
                    key={a._id}
                    act={a}
                    last={i === activities.length - 1}
                    onToggle={toggleDone}
                    onEdit={editActivity}
                    onDelete={deleteActivity}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 820px) { .lead-detail-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function ActivityItem({ act, last, onToggle, onEdit, onDelete }: {
  act: ActivityRecord;
  last: boolean;
  onToggle: (a: ActivityRecord) => void;
  onEdit: (id: string, patch: { title: string; body: string }) => Promise<boolean>;
  onDelete: (a: ActivityRecord) => void;
}) {
  const meta = ACTIVITY_META[act.type] || ACTIVITY_META.note;
  const Icon = meta.icon;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(act.title || meta.label);
  const [body, setBody] = useState(act.body || '');
  const [busy, setBusy] = useState(false);

  // System-generated entries (created/converted/stage-change) aren't editable.
  const editable = !['created', 'converted', 'stage-change'].includes(act.type);

  const startEdit = () => { setTitle(act.title || meta.label); setBody(act.body || ''); setEditing(true); };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await onEdit(act._id, { title: title.trim(), body: body.trim() });
    setBusy(false);
    if (ok) setEditing(false);
  };

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', background: `${meta.color}1f`, color: meta.color, flexShrink: 0 }}><Icon size={15} /></span>
        {!last && <span style={{ flex: 1, width: 2, background: 'var(--border-light)', marginTop: 2 }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 18, flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: '8px 10px', fontSize: 13 }} />
            <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Note (optional)" style={{ padding: '8px 10px', fontSize: 13, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}><X size={13} /> Cancel</button>
              <button type="button" onClick={save} disabled={busy || !title.trim()} className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>
                {busy ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />} Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{act.title || meta.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(act.createdAt, false)}</span>
            </div>
            {act.body && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{act.body}</p>}
            {act.type === 'follow-up' && act.dueAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 12, color: act.done ? 'var(--text-muted)' : '#f97316', fontWeight: 600, textDecoration: act.done ? 'line-through' : 'none' }}>Due {fmt(act.dueAt)}</span>
                <button onClick={() => onToggle(act)} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 11.5 }}>
                  <Check size={12} /> {act.done ? 'Done' : 'Mark done'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {!editing && (
        <div style={{ display: 'flex', gap: 2, height: 'fit-content' }}>
          {editable && (
            <button onClick={startEdit} aria-label="Edit activity" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><Edit3 size={13} /></button>
          )}
          <button onClick={() => onDelete(act)} aria-label="Delete activity" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  );
}

function ActivityComposer({ onAdd }: { onAdd: (p: { type: ActivityType; title: string; body: string; dueAt?: string }) => Promise<boolean> }) {
  const [type, setType] = useState<ActivityType>('note');
  const [body, setBody] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState(false);
  const isFollowUp = type === 'follow-up';

  const submit = async () => {
    if (busy) return;
    // A follow-up needs a date; every other type can be logged with just its
    // label (a note is optional) so quick logging a call/email/meeting works.
    if (isFollowUp && !dueAt) return;
    setBusy(true);
    const meta = ACTIVITY_META[type];
    const ok = await onAdd({ type, title: meta.label, body: body.trim(), dueAt: isFollowUp && dueAt ? new Date(dueAt).toISOString() : undefined });
    if (ok) { setBody(''); setDueAt(''); }
    setBusy(false);
  };

  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 12, background: 'var(--bg-surface-2)' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {COMPOSER_TYPES.map((t) => {
          const meta = ACTIVITY_META[t];
          const on = t === type;
          const Icon = meta.icon;
          return (
            <button key={t} type="button" onClick={() => setType(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? meta.color : 'var(--border-light)'}`, background: on ? `${meta.color}1f` : 'var(--bg-surface)', color: on ? meta.color : 'var(--text-secondary)' }}>
              <Icon size={13} /> {meta.label}
            </button>
          );
        })}
      </div>
      <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={isFollowUp ? 'What is this follow-up about? (optional)' : 'Add a note about this interaction…'} style={{ padding: '10px 12px', fontSize: 13.5, resize: 'vertical', width: '100%' }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {isFollowUp && (
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} aria-label="Follow-up date and time" style={{ padding: '8px 10px', fontSize: 13, width: 'auto', flex: '1 1 200px' }} />
        )}
        <button type="button" onClick={submit} disabled={busy || (isFollowUp && !dueAt)} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />} Add
        </button>
      </div>
    </div>
  );
}

function PurchaseManager({ purchases, onSave }: { purchases: Purchase[]; onSave: (next: Purchase[]) => Promise<boolean> }) {
  const [product, setProduct] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!product.trim() || busy) return;
    setBusy(true);
    const entry: Purchase = { product: product.trim(), value: value.trim(), date: date ? new Date(date).toISOString() : null, notes: notes.trim() };
    const ok = await onSave([...purchases, entry]);
    if (ok) { setProduct(''); setValue(''); setDate(''); setNotes(''); }
    setBusy(false);
  };
  const remove = async (idx: number) => { setBusy(true); await onSave(purchases.filter((_, i) => i !== idx)); setBusy(false); };

  const products = Array.from(new Set(purchases.map((p) => p.product).filter(Boolean)));

  return (
    <div>
      {products.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {products.map((p) => <Chip key={p} label={p} color="#1faf52" />)}
        </div>
      )}

      {purchases.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {purchases.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
              <ShoppingBag size={15} style={{ color: '#1faf52', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{p.product}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1faf52', whiteSpace: 'nowrap' }}>{p.value}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {p.date ? fmt(p.date, false) : ''}{p.date && p.notes ? ' · ' : ''}{p.notes}
                </div>
              </div>
              <button onClick={() => remove(i)} aria-label="Remove purchase" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>No purchases recorded yet — add the first below.</p>
      )}

      {/* Add purchase */}
      <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 12, background: 'var(--bg-surface-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product / machine" style={{ padding: '9px 12px', fontSize: 13.5 }} />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value (e.g. ₹8,00,000)" style={{ padding: '9px 12px', fontSize: 13.5 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Purchase date" style={{ padding: '9px 12px', fontSize: 13.5 }} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ padding: '9px 12px', fontSize: 13.5 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={add} disabled={busy || !product.trim()} className="btn btn-primary btn-sm">
            {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />} Add purchase
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Mail; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <Icon size={15} style={{ color: 'var(--accent)' }} /> {title}
      </h3>
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  const visible = rows.filter(([, v]) => v && v.trim());
  if (visible.length === 0) return <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>—</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {visible.map(([k, v]) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, fontSize: 13.5 }} className="lead-detail-row">
          <span style={{ color: 'var(--text-muted)' }}>{k}</span>
          <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600, background: color.startsWith('var') ? 'var(--accent-soft)' : `${color}1f`, color }}>
      {!color.startsWith('var') && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />} {label}
    </span>
  );
}
