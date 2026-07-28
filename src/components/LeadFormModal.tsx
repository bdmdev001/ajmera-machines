'use client';

import { useMemo, useState } from 'react';
import {
  X, Save, Loader2, User, MapPin, Tag as TagIcon, CalendarClock, Plus, Trash2,
} from 'lucide-react';
import FieldError from '@/components/FieldError';
import PhoneField from '@/components/PhoneField';
import LifecycleStepper from '@/components/LifecycleStepper';
import { SearchableSelect, MultiSelect } from '@/components/CrmSelect';
import { useCrmLists } from '@/hooks/useCrmLists';
import { emptyLead, type LeadRecord, type RecordType } from '@/types/crm';
import {
  requiredMsg, emailMsg, phoneMsg, gstMsg, panMsg, urlMsg, isClean,
} from '@/lib/validation';

interface Props {
  mode: 'add' | 'edit';
  initial?: Partial<LeadRecord>;
  defaultRecordType?: RecordType;
  /** When set (converting an enquiry), links the enquiry after a successful add. */
  linkEnquiryId?: string;
  onClose: () => void;
  onSaved: (lead: LeadRecord, mode: 'add' | 'edit') => void;
  onError: (title: string, message?: string) => void;
}

type SectionId = 'profile' | 'address' | 'qualifiers' | 'followup';
const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'address', label: 'Address & Tax', icon: MapPin },
  { id: 'qualifiers', label: 'Qualifiers', icon: TagIcon },
  { id: 'followup', label: 'Follow-up & Notes', icon: CalendarClock },
];

// Which section owns each validated field — so a submit error jumps to it.
const FIELD_SECTION: Record<string, SectionId> = {
  firstName: 'profile', email: 'profile', mobile: 'profile', whatsapp: 'profile', website: 'profile',
  gstNumber: 'address', panNumber: 'address',
};

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6 };
const inputStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 14, width: '100%' };
const req = <span style={{ color: 'var(--hot)' }}> *</span>;

export default function LeadFormModal({ mode, initial, defaultRecordType = 'Lead', linkEnquiryId, onClose, onSaved, onError }: Props) {
  const [form, setForm] = useState<LeadRecord>(() => ({ ...emptyLead(defaultRecordType), ...initial } as LeadRecord));
  const [section, setSection] = useState<SectionId>('profile');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { names } = useCrmLists();

  const set = <K extends keyof LeadRecord>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((p) => (p[k as string] ? { ...p, [k as string]: '' } : p));
  };
  const setVal = <K extends keyof LeadRecord>(k: K) => (v: LeadRecord[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((p) => (p[k as string] ? { ...p, [k as string]: '' } : p));
  };
  const invalid = (k: string): React.CSSProperties => (errors[k] ? { borderColor: 'var(--hot)' } : {});

  const validate = (f: LeadRecord): Record<string, string> => ({
    firstName: requiredMsg(f.firstName, 'First name'),
    email: emailMsg(f.email, true),
    mobile: phoneMsg(f.mobile ?? '', true, 'Mobile number'),
    whatsapp: phoneMsg(f.whatsapp ?? '', false, 'WhatsApp number'),
    website: urlMsg(f.website ?? '', false, 'website'),
    gstNumber: gstMsg(f.gstNumber ?? ''),
    panNumber: panMsg(f.panNumber ?? ''),
  });

  // Custom fields repeater
  const cf = form.customFields;
  const setCf = (next: { label: string; value: string }[]) => setForm((f) => ({ ...f, customFields: next }));
  const addCf = () => setCf([...cf, { label: '', value: '' }]);
  const updateCf = (i: number, key: 'label' | 'value', v: string) => setCf(cf.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)));
  const removeCf = (i: number) => setCf(cf.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (!isClean(found)) {
      // Jump to the first section that has an error so nothing is hidden.
      const firstBad = Object.keys(found).find((k) => found[k]);
      if (firstBad) setSection(FIELD_SECTION[firstBad] || 'profile');
      return;
    }
    setSaving(true);
    try {
      const url = mode === 'add' ? '/api/admin/crm/leads' : `/api/admin/crm/leads/${form._id}`;
      const method = mode === 'add' ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError('Could not save record', data.error || 'Please try again.'); return; }

      const saved = data.lead as LeadRecord;
      if (mode === 'add' && linkEnquiryId && saved?._id) {
        try {
          await fetch(`/api/enquiries/${linkEnquiryId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: saved._id }),
          });
        } catch { /* non-fatal */ }
      }
      onSaved(saved, mode);
    } catch {
      onError('Network error', 'Could not reach the server while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'add'
    ? (linkEnquiryId ? 'Convert enquiry to customer' : `Add ${form.recordType.toLowerCase()}`)
    : `Edit ${form.recordType.toLowerCase()}`;

  const heading = useMemo(() => {
    const nm = `${form.firstName} ${form.lastName}`.trim();
    return nm || title;
  }, [form.firstName, form.lastName, title]);

  return (
    <div className="animate-fade-in" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} className="lead-form" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 780, margin: 'auto', position: 'relative', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 26px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)' }}>{title}</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{heading}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}><X size={20} /></button>
        </div>

        {/* Section tabs */}
        <div className="lead-form__tabs" style={{ display: 'flex', gap: 4, padding: '10px 26px 0', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
          {SECTIONS.map((s) => {
            const on = s.id === section;
            return (
              <button key={s.id} type="button" onClick={() => setSection(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', border: 'none', background: 'none', cursor: 'pointer', color: on ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`, marginBottom: -1 }}>
                <s.icon size={15} /> {s.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div style={{ padding: 26, overflowY: 'auto', flex: 1 }}>
            {/* PROFILE */}
            {section === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Lifecycle stage</label>
                  <div style={{ padding: '4px 0 2px' }}><LifecycleStepper stage={form.stage} size="sm" /></div>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Managed with the Convert / Move actions — not edited here.</p>
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>First name{req}</label>
                    <input value={form.firstName} onChange={set('firstName')} onBlur={() => setErrors((p) => ({ ...p, firstName: requiredMsg(form.firstName, 'First name') }))} placeholder="e.g. Rajesh" style={{ ...inputStyle, ...invalid('firstName') }} aria-invalid={!!errors.firstName} />
                    <FieldError message={errors.firstName} />
                  </div>
                  <div>
                    <label style={labelStyle}>Last name</label>
                    <input value={form.lastName} onChange={set('lastName')} placeholder="e.g. Sharma" style={inputStyle} />
                  </div>
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Designation</label>
                    <input value={form.designation} onChange={set('designation')} placeholder="e.g. Purchase Manager" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Organisation</label>
                    <input value={form.organisation} onChange={set('organisation')} placeholder="Company / factory name" style={inputStyle} />
                  </div>
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Email{req}</label>
                    <input type="email" value={form.email} onChange={set('email')} onBlur={() => setErrors((p) => ({ ...p, email: emailMsg(form.email, true) }))} placeholder="name@company.com" style={{ ...inputStyle, ...invalid('email') }} aria-invalid={!!errors.email} />
                    <FieldError message={errors.email} />
                  </div>
                  <div>
                    <label style={labelStyle}>Mobile{req}</label>
                    <PhoneField value={form.mobile ?? ''} onChange={setVal('mobile')} onBlur={() => setErrors((p) => ({ ...p, mobile: phoneMsg(form.mobile ?? '', true, 'Mobile number') }))} invalid={!!errors.mobile} required ariaLabel="Mobile number" />
                    <FieldError message={errors.mobile} />
                  </div>
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>WhatsApp</label>
                    <PhoneField value={form.whatsapp ?? ''} onChange={setVal('whatsapp')} onBlur={() => setErrors((p) => ({ ...p, whatsapp: phoneMsg(form.whatsapp ?? '', false, 'WhatsApp number') }))} invalid={!!errors.whatsapp} ariaLabel="WhatsApp number" />
                    <FieldError message={errors.whatsapp} />
                  </div>
                  <div>
                    <label style={labelStyle}>Website</label>
                    <input value={form.website} onChange={set('website')} onBlur={() => setErrors((p) => ({ ...p, website: urlMsg(form.website ?? '', false, 'website') }))} placeholder="https://example.com" style={{ ...inputStyle, ...invalid('website') }} aria-invalid={!!errors.website} />
                    <FieldError message={errors.website} />
                  </div>
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Telephone (Direct)</label>
                    <input value={form.telephoneDirect} onChange={set('telephoneDirect')} placeholder="Optional" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telephone (Office)</label>
                    <input value={form.telephoneOffice} onChange={set('telephoneOffice')} placeholder="Optional" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>List name</label>
                  <input value={form.listName} onChange={set('listName')} placeholder="e.g. Trade Show 2026, Website" style={inputStyle} />
                </div>
              </div>
            )}

            {/* ADDRESS & TAX */}
            {section === 'address' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Address line 1</label>
                  <input value={form.addressLine1} onChange={set('addressLine1')} placeholder="Building, street" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Address line 2</label>
                  <input value={form.addressLine2} onChange={set('addressLine2')} placeholder="Area, landmark" style={inputStyle} />
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><label style={labelStyle}>City</label><input value={form.city} onChange={set('city')} style={inputStyle} /></div>
                  <div><label style={labelStyle}>State</label><input value={form.state} onChange={set('state')} style={inputStyle} /></div>
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><label style={labelStyle}>Country</label><input value={form.country} onChange={set('country')} placeholder="India" style={inputStyle} /></div>
                  <div><label style={labelStyle}>ZIP / PIN code</label><input value={form.zip} onChange={set('zip')} style={inputStyle} /></div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: 4 }}>Tax details</div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>GST number</label>
                    <input value={form.gstNumber} onChange={set('gstNumber')} onBlur={() => setErrors((p) => ({ ...p, gstNumber: gstMsg(form.gstNumber ?? '') }))} placeholder="Optional" style={{ ...inputStyle, ...invalid('gstNumber') }} aria-invalid={!!errors.gstNumber} />
                    <FieldError message={errors.gstNumber} />
                  </div>
                  <div>
                    <label style={labelStyle}>PAN number</label>
                    <input value={form.panNumber} onChange={set('panNumber')} onBlur={() => setErrors((p) => ({ ...p, panNumber: panMsg(form.panNumber ?? '') }))} placeholder="Optional" style={{ ...inputStyle, ...invalid('panNumber') }} aria-invalid={!!errors.panNumber} />
                    <FieldError message={errors.panNumber} />
                  </div>
                </div>
              </div>
            )}

            {/* QUALIFIERS */}
            {section === 'qualifiers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Interested products</label>
                  <MultiSelect value={form.interestedProducts} onChange={setVal('interestedProducts')} options={names('productGroup')} placeholder="Add the machines this lead is interested in…" creatable ariaLabel="Interested products" />
                </div>
                <div>
                  <label style={labelStyle}>Product groups</label>
                  <MultiSelect value={form.productGroups} onChange={setVal('productGroups')} options={names('productGroup')} placeholder="Select product groups…" ariaLabel="Product groups" />
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Lead stage</label>
                    <SearchableSelect value={form.leadStage} onChange={setVal('leadStage')} options={names('leadStage')} placeholder="Pipeline stage…" ariaLabel="Lead stage" />
                  </div>
                  <div>
                    <label style={labelStyle}>Lead potential</label>
                    <SearchableSelect value={form.leadPotential} onChange={setVal('leadPotential')} options={names('leadPotential')} placeholder="Hot / Warm / Cold…" ariaLabel="Lead potential" />
                  </div>
                </div>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Expected deal value</label>
                    <input value={form.dealSize} onChange={set('dealSize')} placeholder="e.g. ₹5,00,000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Assigned salesperson</label>
                    <SearchableSelect value={form.assignedTo} onChange={setVal('assignedTo')} options={names('salesperson')} placeholder="Assign to…" ariaLabel="Assigned salesperson" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Customer group</label>
                  <SearchableSelect value={form.customerGroup} onChange={setVal('customerGroup')} options={names('customerGroup')} placeholder="Select a group…" ariaLabel="Customer group" />
                </div>
                <div>
                  <label style={labelStyle}>Tags</label>
                  <MultiSelect value={form.tags} onChange={setVal('tags')} options={names('tag')} placeholder="Add tags…" creatable ariaLabel="Tags" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Custom fields</label>
                    <button type="button" onClick={addCf} className="btn btn-secondary btn-sm"><Plus size={13} /> Add field</button>
                  </div>
                  {cf.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Add your own labelled fields (e.g. “Region”: “West”).</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {cf.map((c, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                          <input value={c.label} onChange={(e) => updateCf(i, 'label', e.target.value)} placeholder="Label" style={inputStyle} />
                          <input value={c.value} onChange={(e) => updateCf(i, 'value', e.target.value)} placeholder="Value" style={inputStyle} />
                          <button type="button" onClick={() => removeCf(i)} aria-label="Remove field" style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 12px' }}><Trash2 size={15} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FOLLOW-UP & NOTES */}
            {section === 'followup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="lead-form__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Next follow-up</label>
                    <input type="datetime-local" value={toLocalInput(form.nextFollowUpAt)} onChange={(e) => setVal('nextFollowUpAt')(e.target.value ? new Date(e.target.value).toISOString() : null)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Follow-up note</label>
                    <input value={form.nextFollowUpNote} onChange={set('nextFollowUpNote')} placeholder="e.g. Call to discuss quote" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Requirement details</label>
                  <textarea rows={4} value={form.requirementDetails} onChange={set('requirementDetails')} placeholder="What exactly is this lead looking for? (specs, quantity, timeline…)" style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div>
                  <label style={labelStyle}>Notes / additional information</label>
                  <textarea rows={5} value={form.notes} onChange={set('notes')} placeholder="Any context or history for this contact…" style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border-light)', padding: '16px 26px', background: 'var(--bg-surface-2)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fields marked <span style={{ color: 'var(--hot)' }}>*</span> are required</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: 14 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '10px 24px', fontSize: 14 }}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save {form.recordType.toLowerCase()}</>}
              </button>
            </div>
          </div>
        </form>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 620px) { .lead-form__row { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </div>
  );
}

/** ISO → value for <input type="datetime-local"> in the viewer's local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
