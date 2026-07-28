'use client';

import { useEffect, useState } from 'react';
import { EMPTY_LISTS, type CrmLists, type CrmListItem } from '@/types/crm';

/**
 * Load the admin-configurable CRM option lists (customer groups, lead stages,
 * potentials, tags, salespeople) once, exposing option-name arrays for the
 * selects. `reloadKey` can be bumped to refetch after the lists are edited.
 *
 * Product Groups are NOT admin-managed here — they are sourced live from the
 * existing Product Categories (single source of truth), so any category added,
 * renamed or removed in Product Management is reflected in the CRM automatically.
 */
export function useCrmLists(reloadKey = 0) {
  const [lists, setLists] = useState<CrmLists>(EMPTY_LISTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [listsRes, catsRes] = await Promise.all([
          fetch('/api/admin/crm/lists'),
          fetch('/api/categories'),
        ]);
        const listsData = await listsRes.json().catch(() => ({}));
        const catsData = await catsRes.json().catch(() => ({}));
        if (cancelled) return;

        const next: CrmLists = { ...EMPTY_LISTS, ...(listsRes.ok && listsData.lists ? listsData.lists : {}) };

        // Product Groups come from Product Categories — overwrite whatever the
        // CRM lists endpoint returned so categories are the only source.
        if (catsRes.ok && Array.isArray(catsData.categories)) {
          next.productGroup = (catsData.categories as { _id: string; name: string }[]).map((c, i): CrmListItem => ({
            _id: c._id, kind: 'productGroup', name: c.name, order: i, color: '', archived: false,
          }));
        } else {
          next.productGroup = [];
        }

        setLists(next);
      } catch {
        /* leave empty on failure — selects simply show no options */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const names = (kind: keyof CrmLists) => lists[kind].filter((i) => !i.archived).map((i) => i.name);

  return { lists, loading, names };
}
