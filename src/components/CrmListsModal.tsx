'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2, Check, SlidersHorizontal, ToggleLeft, ToggleRight } from 'lucide-react';
import { EMPTY_LISTS, type CrmLists, type CrmListItem, type CrmListKind } from '@/types/crm';

interface Props {
  onClose: () => void;
  /** Called after any change so the parent can refresh its option lists. */
  onChanged: () => void;
  onError: (title: string, message?: string) => void;
}

/* Product Groups are intentionally absent — they are sourced from Product
   Categories (managed in the Categories module), not edited here. */
const KINDS: { kind: CrmListKind; label: string; colored?: boolean }[] = [
  { kind: 'leadStage', label: 'Lead Stages', colored: true },
  { kind: 'leadPotential', label: 'Lead Potentials', colored: true },
  { kind: 'customerGroup', label: 'Customer Groups' },
  { kind: 'salesperson', label: 'Salespeople' },
  { kind: 'tag', label: 'Tags' },
];

export default function CrmListsModal({ onClose, onChanged, onError }: Props) {
  const [lists, setLists] = useState<CrmLists>(EMPTY_LISTS);
  const [kind, setKind] = useState<CrmListKind>('leadStage');
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/crm/lists');
        const data = await res.json();
        if (!cancelled && res.ok && data.lists) setLists({ ...EMPTY_LISTS, ...data.lists });
      } catch { /* ignore */ } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const current = KINDS.find((k) => k.kind === kind)!;
  const items = lists[kind];

  const add = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/crm/lists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name, color: current.colored ? newColor : '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError('Could not add value', data.error || 'Please try again.'); return; }
      setNewName('');
      reload();
      onChanged();
    } catch {
      onError('Network error', 'Could not add the value. Please try again.');
    } finally { setBusy(false); }
  };

  const rename = async (item: CrmListItem, name: string) => {
    if (name.trim() === item.name || !name.trim()) return;
    const res = await fetch(`/api/admin/crm/lists/${item._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { onError('Could not rename', data.error || 'Please try again.'); reload(); return; }
    reload();
    onChanged();
  };

  const recolor = async (item: CrmListItem, color: string) => {
    await fetch(`/api/admin/crm/lists/${item._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color }),
    }).catch(() => null);
    reload();
    onChanged();
  };

  /** Active ⇄ Inactive. An inactive value stays on the records that already
   *  carry it but is no longer offered in the add/edit dropdowns. */
  const toggleStatus = async (item: CrmListItem) => {
    const res = await fetch(`/api/admin/crm/lists/${item._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !item.archived }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      onError('Could not update status', d.error || 'Please try again.');
      return;
    }
    reload();
    onChanged();
  };

  const remove = async (item: CrmListItem) => {
    const res = await fetch(`/api/admin/crm/lists/${item._id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); onError('Could not delete', d.error); return; }
    reload();
    onChanged();
  };

  return (
    <div className="animate-fade-in" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 560, margin: 'auto', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}><SlidersHorizontal size={18} /> Manage lists</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '10px 24px 0', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
          {KINDS.map((k) => {
            const on = k.kind === kind;
            return (
              <button key={k.kind} type="button" onClick={() => setKind(k.kind)} style={{ padding: '9px 12px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', border: 'none', background: 'none', cursor: 'pointer', color: on ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`, marginBottom: -1 }}>{k.label}</button>
            );
          })}
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : (
            <>
              {/* Add row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {current.colored && (
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} aria-label="Colour" style={{ width: 46, padding: 4, flexShrink: 0, cursor: 'pointer' }} />
                )}
                <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={`Add a ${current.label.replace(/s$/, '').toLowerCase()}…`} style={{ flex: 1, padding: '10px 12px', fontSize: 14 }} />
                <button type="button" onClick={add} disabled={busy || !newName.trim()} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}><Plus size={15} /> Add</button>
              </div>

              {items.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No values yet — add your first above.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((item) => (
                    <ListRow
                      key={`${item._id}:${item.name}:${item.archived}`}
                      item={item}
                      colored={!!current.colored}
                      onRename={rename}
                      onRecolor={recolor}
                      onRemove={remove}
                      onToggleStatus={toggleStatus}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

/** Date only, fixed locale + IST so server and client render the same string. */
function formatDay(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function ListRow({ item, colored, onRename, onRecolor, onRemove, onToggleStatus }: {
  item: CrmListItem; colored: boolean;
  onRename: (i: CrmListItem, name: string) => void;
  onRecolor: (i: CrmListItem, color: string) => void;
  onRemove: (i: CrmListItem) => void;
  onToggleStatus: (i: CrmListItem) => void;
}) {
  // Keyed by `${_id}:${name}:${archived}` in the parent, so this remounts
  // (re-seeding the local editable value) whenever the record changes elsewhere.
  const [name, setName] = useState(item.name);
  const dirty = name.trim() !== item.name && name.trim().length > 0;
  const active = !item.archived;

  // Usage is served for customer groups only; a value still in use can be
  // deactivated but never deleted (the API enforces the same rule).
  const inUse = item.usage ?? 0;
  const locked = inUse > 0;

  const created = formatDay(item.createdAt);
  const updated = formatDay(item.updatedAt);
  const meta = [
    created && `Added ${created}`,
    updated && updated !== created && `Updated ${updated}`,
    item.usage !== undefined && `${inUse} record${inUse === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 8px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-2)', opacity: active ? 1 : 0.72 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {colored && (
          <input type="color" value={item.color || '#94a3b8'} onChange={(e) => onRecolor(item, e.target.value)} aria-label={`Colour for ${item.name}`} style={{ width: 34, height: 30, padding: 2, flexShrink: 0, cursor: 'pointer' }} />
        )}
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onRename(item, name); }} style={{ flex: 1, minWidth: 0, padding: '7px 10px', fontSize: 13.5, border: '1px solid transparent', background: 'transparent', textDecoration: active ? 'none' : 'line-through' }} />
        {dirty && (
          <button type="button" onClick={() => onRename(item, name)} aria-label="Save" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4 }}><Check size={16} /></button>
        )}
        <button
          type="button"
          onClick={() => onToggleStatus(item)}
          aria-pressed={active}
          title={active ? 'Deactivate — stops it being offered on new records' : 'Activate'}
          style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px',
            fontSize: 11.5, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${active ? 'rgba(31,175,82,0.35)' : 'var(--border-light)'}`,
            background: active ? 'rgba(31,175,82,0.12)' : 'var(--bg-surface)',
            color: active ? '#1faf52' : 'var(--text-muted)',
          }}
        >
          {active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {active ? 'Active' : 'Inactive'}
        </button>
        <button
          type="button"
          onClick={() => onRemove(item)}
          disabled={locked}
          aria-label={`Delete ${item.name}`}
          title={locked ? `Assigned to ${inUse} record${inUse === 1 ? '' : 's'} — deactivate it instead` : `Delete ${item.name}`}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1, padding: 4 }}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {meta && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 10px 2px', marginLeft: colored ? 42 : 0 }}>{meta}</div>
      )}
    </div>
  );
}
