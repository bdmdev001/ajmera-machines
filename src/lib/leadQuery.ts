/* ============================================================================
   Shared search/filter/sort translation for the unified Leads & Customers
   collection. The listing route and the export route read the same query
   string, so "export" always means "what the admin is currently looking at".
   ========================================================================= */

export const LEAD_SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name_asc: { firstName: 1, lastName: 1 },
  name_desc: { firstName: -1, lastName: -1 },
  followup: { nextFollowUpAt: 1 },
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build the Mongo filter for a leads query string (`q`, `recordType`, list
 *  filters and the created-date range). Absent params are simply skipped, so
 *  an empty query string yields an unfiltered `{}`. */
export function buildLeadFilter(searchParams: URLSearchParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const recordType = searchParams.get('recordType');
  if (recordType === 'Lead' || recordType === 'Customer') filter.recordType = recordType;

  const eq = (param: string, field: string) => {
    const v = (searchParams.get(param) || '').trim();
    if (v) filter[field] = v;
  };
  eq('leadStage', 'leadStage');
  eq('leadPotential', 'leadPotential');
  eq('customerGroup', 'customerGroup');
  eq('assignedTo', 'assignedTo');

  const productGroup = (searchParams.get('productGroup') || '').trim();
  if (productGroup) filter.productGroups = productGroup;
  const tag = (searchParams.get('tag') || '').trim();
  if (tag) filter.tags = tag;

  // Created-date range (inclusive). `to` is pushed to end-of-day.
  const from = (searchParams.get('from') || '').trim();
  const to = (searchParams.get('to') || '').trim();
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) { const d = new Date(from); if (!Number.isNaN(d.getTime())) range.$gte = d; }
    if (to) { const d = new Date(to); if (!Number.isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); range.$lte = d; } }
    if (Object.keys(range).length) filter.createdAt = range;
  }

  const q = (searchParams.get('q') || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { firstName: rx }, { lastName: rx }, { email: rx }, { mobile: rx },
      { organisation: rx }, { whatsapp: rx }, { gstNumber: rx }, { panNumber: rx },
      { city: rx }, { designation: rx },
    ];
  }

  return filter;
}

/** Resolve the `sort` param to a Mongo sort spec, defaulting to newest-first. */
export function buildLeadSort(searchParams: URLSearchParams): Record<string, 1 | -1> {
  const key = (searchParams.get('sort') || 'newest').toLowerCase();
  return LEAD_SORTS[key] || LEAD_SORTS.newest;
}
