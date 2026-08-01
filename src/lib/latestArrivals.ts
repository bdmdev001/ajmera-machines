/* ============================================================================
   Latest Arrivals — one definition of "is this product showing right now",
   shared by the homepage query, the admin badge and the product form.

   The section is entirely admin-curated: a product appears only when an admin
   has switched it on, never because it happens to be recent. The optional
   from/until window then schedules that decision:

     from empty   → visible immediately
     until empty  → visible indefinitely
     until passed → drops out of the section, the listing itself stays active

   Pure and dependency-free (no DB, no browser), so it is safe to import from
   server components, API routes and client components alike.
   ========================================================================= */

/** Homepage cap. Fewer marked products simply render fewer cards. */
export const LATEST_ARRIVALS_LIMIT = 8;

/** Priority is a plain sort key — small, admin-friendly bounds. */
export const PRIORITY_MIN = 0;
export const PRIORITY_MAX = 9999;

export interface LatestArrivalFields {
  isLatestArrival?: boolean | null;
  latestArrivalPriority?: number | null;
  latestArrivalFrom?: Date | string | null;
  latestArrivalUntil?: Date | string | null;
}

/** 'off' — switched off · 'scheduled' — on, waiting for its start date ·
 *  'live' — showing on the homepage now · 'expired' — its end date has passed. */
export type LatestArrivalState = 'off' | 'scheduled' | 'live' | 'expired';

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Where a product currently sits in the Latest Arrivals lifecycle. */
export function latestArrivalState(p: LatestArrivalFields, now: Date = new Date()): LatestArrivalState {
  if (!p.isLatestArrival) return 'off';
  const from = toDate(p.latestArrivalFrom);
  const until = toDate(p.latestArrivalUntil);
  if (until && until.getTime() < now.getTime()) return 'expired';
  if (from && from.getTime() > now.getTime()) return 'scheduled';
  return 'live';
}

/** True when the product should render in the homepage section right now. */
export function isLatestArrivalLive(p: LatestArrivalFields, now: Date = new Date()): boolean {
  return latestArrivalState(p, now) === 'live';
}

/** Mongo filter for the live set. `field: null` also matches documents where
 *  the field is absent, so products saved before this feature existed (and
 *  those saved without a schedule) are treated as "no bound" rather than
 *  silently excluded. */
export function latestArrivalFilter(now: Date = new Date()): Record<string, unknown> {
  return {
    isLatestArrival: true,
    $and: [
      { $or: [{ latestArrivalFrom: null }, { latestArrivalFrom: { $lte: now } }] },
      { $or: [{ latestArrivalUntil: null }, { latestArrivalUntil: { $gte: now } }] },
    ],
  };
}

/** Display order: manual priority ascending, then most recently updated. */
export const LATEST_ARRIVAL_SORT = { latestArrivalPriority: 1, updatedAt: -1 } as const;

/** Clamp any admin input to a usable priority. */
export function normalizePriority(v: unknown): number {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(PRIORITY_MAX, Math.max(PRIORITY_MIN, n));
}

/* The site presents every date in IST (see the admin formatters), so a picked
   day is resolved against IST rather than whatever timezone the server runs in
   — otherwise "until 15 Aug" would expire at 05:30 IST on the 15th in a UTC
   deployment. IST is a fixed +05:30 with no DST, so a constant is exact. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Parse a date input (yyyy-mm-dd or ISO) to an instant, or null when blank.
 *  A bare day is anchored to the START of that day in IST for `from` and the
 *  END of it for `until`, so "Display Until = today" keeps the product up for
 *  the whole of today instead of hiding it at midnight. */
export function parseScheduleDate(v: unknown, edge: 'start' | 'end' = 'start'): Date | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const day = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) {
    const [, y, m, d] = day;
    const ms = edge === 'end'
      ? Date.UTC(+y, +m - 1, +d, 23, 59, 59, 999)
      : Date.UTC(+y, +m - 1, +d, 0, 0, 0, 0);
    return new Date(ms - IST_OFFSET_MS);
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Validate an admin's Latest Arrivals input. Returns an error message or ''. */
export function validateSchedule(from: Date | null, until: Date | null): string {
  if (from && until && until.getTime() < from.getTime()) {
    return 'Display Until must be on or after Display From.';
  }
  return '';
}

export interface LatestArrivalUpdate {
  isLatestArrival: boolean;
  latestArrivalPriority: number;
  latestArrivalFrom: Date | null;
  latestArrivalUntil: Date | null;
}

/** Map a raw request body onto the four persisted fields, or report why it is
 *  invalid. Shared by the create and update routes so they can never disagree.
 *  Switching the flag off clears the schedule, so a product that is re-enabled
 *  later doesn't silently inherit an old, expired window. */
export function readLatestArrivalInput(
  body: Record<string, unknown>,
): { data: LatestArrivalUpdate; error: '' } | { data: null; error: string } {
  const on = Boolean(body.isLatestArrival);
  if (!on) {
    return { data: { isLatestArrival: false, latestArrivalPriority: 0, latestArrivalFrom: null, latestArrivalUntil: null }, error: '' };
  }

  const raw = body.latestArrivalPriority;
  if (raw != null && raw !== '' && !Number.isFinite(Number(raw))) {
    return { data: null, error: 'Display Priority must be a number.' };
  }

  const from = parseScheduleDate(body.latestArrivalFrom, 'start');
  const until = parseScheduleDate(body.latestArrivalUntil, 'end');
  if (body.latestArrivalFrom && !from) return { data: null, error: 'Display From is not a valid date.' };
  if (body.latestArrivalUntil && !until) return { data: null, error: 'Display Until is not a valid date.' };

  const scheduleError = validateSchedule(from, until);
  if (scheduleError) return { data: null, error: scheduleError };

  return {
    data: {
      isLatestArrival: true,
      latestArrivalPriority: normalizePriority(raw ?? 0),
      latestArrivalFrom: from,
      latestArrivalUntil: until,
    },
    error: '',
  };
}

/** A yyyy-mm-dd string for <input type="date">, or ''. Read back in IST so the
 *  day an admin picked is the day they see when they reopen the form. */
export function toDateInput(v: Date | string | null | undefined): string {
  const d = toDate(v);
  if (!d) return '';
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
