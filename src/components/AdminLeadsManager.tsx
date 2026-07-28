'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, Plus, Edit3, Trash2, Loader2, ChevronLeft, ChevronRight, Eye,
  Contact, FileSpreadsheet, FileDown, SlidersHorizontal, UserCheck, CalendarClock,
  Mail, Phone, X, Filter, ArrowLeft,
} from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';
import LeadFormModal from '@/components/LeadFormModal';
import CrmListsModal from '@/components/CrmListsModal';
import TransitionModal from '@/components/TransitionModal';
import { SearchableSelect } from '@/components/CrmSelect';
import { useCrmLists } from '@/hooks/useCrmLists';
import { colorFor, stageOf, TRANSITIONS, type LeadRecord, type RecordType, type LifecycleStage, type TransitionDef } from '@/types/crm';

type PageSize = 25 | 50 | 100 | 'all';
const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100, 'all'];

const SORTS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'followup', label: 'Follow-up due' },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

interface Counts { lead: number; customer: number; all: number }

export default function AdminLeadsManager() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts>({ lead: 0, customer: 0, all: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [q, setQ] = useState('');
  const [recordType, setRecordType] = useState<'' | RecordType>('');
  const [leadStage, setLeadStage] = useState('');
  const [leadPotential, setLeadPotential] = useState('');
  const [customerGroup, setCustomerGroup] = useState('');
  const [productGroup, setProductGroup] = useState('');
  const [tag, setTag] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formType, setFormType] = useState<RecordType>('Lead');
  const [editing, setEditing] = useState<Partial<LeadRecord> | undefined>(undefined);
  const [listsOpen, setListsOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<{ lead: LeadRecord; def: TransitionDef } | null>(null);

  const [listsKey, setListsKey] = useState(0);
  const { lists, names } = useCrmLists(listsKey);
  const { modal, showSuccess, showError, confirm } = useAdminAlert();

  const activeFilters = [recordType, leadStage, leadPotential, customerGroup, productGroup, tag, assignedTo, from, to].filter(Boolean).length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize), sort });
        if (q.trim()) params.set('q', q.trim());
        if (recordType) params.set('recordType', recordType);
        if (leadStage) params.set('leadStage', leadStage);
        if (leadPotential) params.set('leadPotential', leadPotential);
        if (customerGroup) params.set('customerGroup', customerGroup);
        if (productGroup) params.set('productGroup', productGroup);
        if (tag) params.set('tag', tag);
        if (assignedTo) params.set('assignedTo', assignedTo);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const res = await fetch(`/api/admin/crm/leads?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { showError('Could not load records', data.error || 'Please try again.'); return; }
        setLeads(data.leads);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setCounts(data.counts);
        if (data.page !== page) setPage(data.page);
      } catch {
        if (!cancelled) showError('Network error', 'Could not reach the server. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, pageSize, q, recordType, leadStage, leadPotential, customerGroup, productGroup, tag, assignedTo, from, to, sort, refreshKey, showError]);

  const reload = useCallback(() => { setLoading(true); setRefreshKey((k) => k + 1); }, []);
  const onFilter = (fn: () => void) => { setLoading(true); fn(); setPage(1); };

  const openAdd = (type: RecordType) => { setFormMode('add'); setFormType(type); setEditing({ recordType: type }); setFormOpen(true); };
  const openEdit = (l: LeadRecord) => { setFormMode('edit'); setFormType(l.recordType); setEditing(l); setFormOpen(true); };

  const handleSaved = (saved: LeadRecord, mode: 'add' | 'edit') => {
    setFormOpen(false);
    reload();
    showSuccess(mode === 'add' ? `${saved.recordType} added` : `${saved.recordType} updated`, `“${fullName(saved)}” has been saved.`);
  };

  const openTransition = (lead: LeadRecord, def: TransitionDef) => setTransitionTarget({ lead, def });
  const onTransitionDone = (updated: LeadRecord) => {
    setTransitionTarget(null);
    reload();
    showSuccess('Record moved', `“${fullName(updated)}” is now at the ${updated.stage} stage.`);
  };

  const handleDelete = async (l: LeadRecord) => {
    const ok = await confirm({ title: `Delete this ${l.recordType.toLowerCase()}?`, message: `“${fullName(l)}” and its activity history will be permanently removed. This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/crm/leads/${l._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showError('Could not delete', data.error || 'Please try again.'); return; }
      const targetPage = leads.length === 1 && page > 1 ? page - 1 : page;
      setLoading(true);
      if (targetPage !== page) setPage(targetPage); else reload();
      showSuccess('Record deleted', `“${fullName(l)}” has been removed.`);
    } catch { showError('Network error', 'Could not delete. Please try again.'); }
  };

  const clearFilters = () => onFilter(() => {
    setRecordType(''); setLeadStage(''); setLeadPotential(''); setCustomerGroup(''); setProductGroup(''); setTag(''); setAssignedTo(''); setFrom(''); setTo('');
  });

  const exportUrl = (format: string) => {
    const params = new URLSearchParams({ format });
    if (recordType) params.set('recordType', recordType);
    return `/api/admin/crm/leads/export?${params.toString()}`;
  };

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1),
    [totalPages, page],
  );

  const th: React.CSSProperties = { padding: '13px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' };
  const td: React.CSSProperties = { padding: '13px 16px', fontSize: 13.5, verticalAlign: 'middle' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {modal}
      {formOpen && (
        <LeadFormModal mode={formMode} initial={editing} defaultRecordType={formType} onClose={() => setFormOpen(false)} onSaved={handleSaved} onError={showError} />
      )}
      {listsOpen && (
        <CrmListsModal onClose={() => setListsOpen(false)} onChanged={() => setListsKey((k) => k + 1)} onError={showError} />
      )}
      {transitionTarget && (
        <TransitionModal lead={transitionTarget.lead} def={transitionTarget.def} onClose={() => setTransitionTarget(null)} onDone={onTransitionDone} onError={showError} />
      )}

      {/* Header: count + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Contact size={22} /></span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{total.toLocaleString('en-US')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{recordType === 'Customer' ? 'customers' : recordType === 'Lead' ? 'leads' : 'records'} shown</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setListsOpen(true)} className="btn btn-secondary btn-sm"><SlidersHorizontal size={15} /> Manage lists</button>
          <a href={exportUrl('csv')} download className="btn btn-secondary btn-sm"><FileDown size={15} /> CSV</a>
          <a href={exportUrl('xlsx')} download className="btn btn-secondary btn-sm"><FileSpreadsheet size={15} /> Excel</a>
          <button onClick={() => openAdd('Lead')} className="btn btn-secondary btn-sm"><Plus size={15} /> Add lead</button>
          <button onClick={() => openAdd('Customer')} className="btn btn-primary btn-sm"><Plus size={15} /> Add customer</button>
        </div>
      </div>

      {/* Record-type tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-light)' }}>
        {([['', 'All', counts.all], ['Lead', 'Leads', counts.lead], ['Customer', 'Customers', counts.customer]] as const).map(([val, label, n]) => {
          const on = recordType === val;
          return (
            <button key={label} type="button" onClick={() => onFilter(() => setRecordType(val as '' | RecordType))} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 16px', fontSize: 14, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: on ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`, marginBottom: -1 }}>
              {label}
              <span style={{ fontSize: 12, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)', background: on ? 'var(--accent-soft)' : 'var(--bg-surface-2)', color: on ? 'var(--accent)' : 'var(--text-muted)' }}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Search + filter toggle + sort */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
          <input type="text" placeholder="Search name, email, mobile, company…" value={q} onChange={(e) => onFilter(() => setQ(e.target.value))} style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 14 }} />
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <button type="button" onClick={() => setShowFilters((s) => !s)} className="btn btn-secondary btn-sm" style={{ position: 'relative' }}>
          <Filter size={15} /> Filters
          {activeFilters > 0 && <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 700, padding: '0 6px', borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: '#fff' }}>{activeFilters}</span>}
        </button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          Sort
          <select value={sort} onChange={(e) => onFilter(() => setSort(e.target.value))} style={{ width: 'auto', height: 40, padding: '0 30px 0 12px', fontSize: 13, fontWeight: 600 }}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 18 }}>
          <div className="lead-filters" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <Field label="Lead stage"><SearchableSelect value={leadStage} onChange={(v) => onFilter(() => setLeadStage(v))} options={names('leadStage')} placeholder="Any stage" /></Field>
            <Field label="Lead potential"><SearchableSelect value={leadPotential} onChange={(v) => onFilter(() => setLeadPotential(v))} options={names('leadPotential')} placeholder="Any potential" /></Field>
            <Field label="Customer group"><SearchableSelect value={customerGroup} onChange={(v) => onFilter(() => setCustomerGroup(v))} options={names('customerGroup')} placeholder="Any group" /></Field>
            <Field label="Product group"><SearchableSelect value={productGroup} onChange={(v) => onFilter(() => setProductGroup(v))} options={names('productGroup')} placeholder="Any product group" /></Field>
            <Field label="Tag"><SearchableSelect value={tag} onChange={(v) => onFilter(() => setTag(v))} options={names('tag')} placeholder="Any tag" /></Field>
            <Field label="Salesperson"><SearchableSelect value={assignedTo} onChange={(v) => onFilter(() => setAssignedTo(v))} options={names('salesperson')} placeholder="Any salesperson" /></Field>
            <Field label="Created from"><input type="date" value={from} onChange={(e) => onFilter(() => setFrom(e.target.value))} style={{ padding: '11px 12px', fontSize: 13.5 }} /></Field>
            <Field label="Created to"><input type="date" value={to} onChange={(e) => onFilter(() => setTo(e.target.value))} style={{ padding: '11px 12px', fontSize: 13.5 }} /></Field>
          </div>
          {activeFilters > 0 && (
            <button type="button" onClick={clearFilters} className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}><X size={14} /> Clear filters</button>
          )}
        </div>
      )}

      {/* Table / cards */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: 10, fontSize: 14 }}>Loading records…</div>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            {q.trim() || activeFilters ? 'No records match your search or filters.' : 'No records yet — add your first lead or customer.'}
          </div>
        ) : (
          <>
            <div className="lead-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={th}>Name / Company</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Lifecycle</th>
                    <th style={th}>Stage</th>
                    <th style={th}>Potential</th>
                    <th style={th}>Follow-up</th>
                    <th style={th}>Created</th>
                    <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={td}>
                        <Link href={`/admin/leads/${l._id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fullName(l)}</Link>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{l.organisation || (l.designation || '—')}</div>
                      </td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} /> {l.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' }}><Phone size={12} /> {l.mobile}</div>
                      </td>
                      <td style={td}><StageBadge stage={stageOf(l)} /></td>
                      <td style={td}>{l.leadStage ? <Chip label={l.leadStage} color={colorFor(lists.leadStage, l.leadStage)} /> : '—'}</td>
                      <td style={td}>{l.leadPotential ? <Chip label={l.leadPotential} color={colorFor(lists.leadPotential, l.leadPotential)} /> : '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{l.nextFollowUpAt ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CalendarClock size={13} /> {formatDate(l.nextFollowUpAt)}</span> : '—'}</td>
                      <td style={{ ...td, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(l.createdAt)}</td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <RowActions l={l} onEdit={() => openEdit(l)} onTransition={openTransition} onDelete={() => handleDelete(l)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lead-cards" style={{ display: 'none', flexDirection: 'column' }}>
              {leads.map((l) => (
                <div key={l._id} style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/admin/leads/${l._id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fullName(l)}</Link>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{l.organisation || '—'}</div>
                    </div>
                    <StageBadge stage={stageOf(l)} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mail size={13} /> {l.email}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> {l.mobile}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {l.leadStage && <Chip label={l.leadStage} color={colorFor(lists.leadStage, l.leadStage)} />}
                    {l.leadPotential && <Chip label={l.leadPotential} color={colorFor(lists.leadPotential, l.leadPotential)} />}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <RowActions l={l} onEdit={() => openEdit(l)} onTransition={openTransition} onDelete={() => handleDelete(l)} labelled />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer: page size + pagination */}
        {!loading && total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{pageSize === 'all' ? `Showing ${leads.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}` : `Page ${page} of ${totalPages}`}</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                Rows
                <select value={String(pageSize)} onChange={(e) => onFilter(() => setPageSize(e.target.value === 'all' ? 'all' : (Number(e.target.value) as PageSize)))} style={{ width: 'auto', height: 36, padding: '0 30px 0 12px', fontSize: 13, fontWeight: 600 }}>
                  {PAGE_SIZE_OPTIONS.map((opt) => <option key={String(opt)} value={String(opt)}>{opt === 'all' ? 'All' : opt}</option>)}
                </select>
              </label>
            </div>
            {pageSize !== 'all' && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PageBtn onClick={() => page > 1 && (setLoading(true), setPage(page - 1))} disabled={page === 1} aria="Previous page"><ChevronLeft size={16} /></PageBtn>
                {pageNumbers.map((n, idx) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {idx > 0 && pageNumbers[idx - 1] !== n - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                    <button type="button" onClick={() => { if (n !== page) { setLoading(true); setPage(n); } }} style={{ minWidth: 36, height: 36, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', border: '1px solid ' + (n === page ? 'var(--accent)' : 'var(--border-light)'), background: n === page ? 'var(--accent)' : 'var(--bg-surface)', color: n === page ? '#fff' : 'var(--text-primary)' }}>{n}</button>
                  </span>
                ))}
                <PageBtn onClick={() => page < totalPages && (setLoading(true), setPage(page + 1))} disabled={page === totalPages} aria="Next page"><ChevronRight size={16} /></PageBtn>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) {
          .lead-table-wrap { display: none; }
          .lead-cards { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function fullName(l: LeadRecord): string { return `${l.firstName} ${l.lastName}`.trim() || l.email; }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const STAGE_TONE: Record<LifecycleStage, { bg: string; color: string }> = {
  Enquiry: { bg: 'var(--bg-surface-2)', color: 'var(--text-secondary)' },
  Lead: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  Customer: { bg: 'rgba(31,175,82,0.12)', color: '#1faf52' },
};

function StageBadge({ stage }: { stage: LifecycleStage }) {
  const t = STAGE_TONE[stage];
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 11.5, fontWeight: 700, background: t.bg, color: t.color }}>{stage}</span>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 'var(--radius-pill)', fontSize: 11.5, fontWeight: 600, background: `${color}1f`, color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} /> {label}
    </span>
  );
}

function PageBtn({ children, onClick, disabled, aria }: { children: React.ReactNode; onClick: () => void; disabled: boolean; aria: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={aria} style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', color: disabled ? 'var(--text-muted)' : 'var(--text-primary)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>{children}</button>
  );
}

function RowActions({ l, onEdit, onTransition, onDelete, labelled }: {
  l: LeadRecord; onEdit: () => void; onTransition: (lead: LeadRecord, def: TransitionDef) => void; onDelete: () => void; labelled?: boolean;
}) {
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: labelled ? '1px solid var(--border-light)' : 'none', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', padding: labelled ? '6px 10px' : 6, fontSize: 12.5 };
  const defs = TRANSITIONS[stageOf(l)];
  return (
    <div style={{ display: 'inline-flex', gap: labelled ? 6 : 2, flexWrap: 'wrap' }}>
      <Link href={`/admin/leads/${l._id}`} aria-label="View" title="View" style={btn}><Eye size={15} />{labelled && ' View'}</Link>
      <button type="button" onClick={onEdit} aria-label="Edit" title="Edit" style={btn}><Edit3 size={15} />{labelled && ' Edit'}</button>
      {defs.map((def) => (
        <button key={def.to} type="button" onClick={() => onTransition(l, def)} aria-label={def.label} title={def.label}
          style={{ ...btn, color: def.direction === 'forward' ? '#1faf52' : 'var(--secondary)' }}>
          {def.direction === 'forward' ? <UserCheck size={15} /> : <ArrowLeft size={15} />}{labelled && ` ${def.label}`}
        </button>
      ))}
      <button type="button" onClick={onDelete} aria-label="Delete" title="Delete" style={{ ...btn, color: 'var(--text-muted)' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4d')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}><Trash2 size={15} />{labelled && ' Delete'}</button>
    </div>
  );
}
