/* ============================================================================
   Centralized SEO product-URL generation (client-safe: pure string helpers,
   no node/DB/Cloudinary imports).

   Canonical URL shape:
       /products/{descriptive-slug}-{identifier}

   e.g. /products/amada-promecam-rg35-hydraulic-press-brake-stk0002010

   The trailing {identifier} is the product's stockNo (lowercased) — unique and
   immutable — so every product URL is unique regardless of the descriptive part,
   and the detail route can resolve a product by parsing that final token alone.
   ========================================================================= */

/** Minimal shape needed to build a URL — satisfied by IProduct and by ad-hoc
 *  objects (search index, enquiry mail) that carry a subset of these fields. */
export interface SluggableProduct {
  id?: string;
  stockNo?: string;
  make?: string;
  model?: string;
  title?: string;
}

/** Boilerplate tokens stripped from the descriptive slug. Seed titles follow a
 *  "<Brand> Make <Type>" pattern, so "make" is noise once make/model lead. */
const STOP_TOKENS = new Set(['make']);

/** Cap the descriptive portion so very long titles don't create absurd URLs.
 *  Truncation is safe: lookup uses the trailing identifier, not this text. */
const MAX_DESCRIPTIVE_LEN = 70;

/** Lowercase, transliterate-lite slugify. Handles &, apostrophes, brackets,
 *  punctuation and whitespace; collapses and trims hyphens; preserves numbers. */
export function slugifyText(input: string | undefined | null): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘`]/g, '') // drop apostrophes so "o'clock" -> oclock
    .replace(/[^a-z0-9]+/g, '-') // brackets, slashes, dots, spaces -> hyphen
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** A field is "usable" if present and not the placeholder 'N/A'. */
function usable(v: string | undefined | null): boolean {
  const s = String(v ?? '').trim();
  return s.length > 0 && s.toUpperCase() !== 'N/A';
}

/** The unique, immutable identifier token appended to every slug. */
function identifierToken(p: SluggableProduct): string {
  return slugifyText(p.stockNo && usable(p.stockNo) ? p.stockNo : p.id) || '';
}

/** Build the descriptive portion: make + model + title, de-duplicated. */
function descriptiveSlug(p: SluggableProduct): string {
  const source = [p.make, p.model, p.title].filter(usable).join(' ');
  const tokens = slugifyText(source)
    .split('-')
    .filter(Boolean)
    .filter((t) => !STOP_TOKENS.has(t));

  // De-duplicate while preserving first-occurrence order ("AMADA … AMADA" -> once).
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) { seen.add(t); unique.push(t); }
  }

  // Trim to the length cap on whole-token boundaries.
  let out = '';
  for (const t of unique) {
    const next = out ? `${out}-${t}` : t;
    if (next.length > MAX_DESCRIPTIVE_LEN) break;
    out = next;
  }
  return out;
}

/**
 * Canonical slug for a product, e.g.
 *   amada-promecam-rg35-hydraulic-press-brake-stk0002010
 * Falls back to just the identifier when descriptive fields are all missing.
 */
export function getProductSlug(p: SluggableProduct): string {
  const id = identifierToken(p);
  const desc = descriptiveSlug(p);
  if (!id) return desc; // extreme edge: no stockNo and no id
  return desc ? `${desc}-${id}` : id;
}

/** Root-relative canonical product URL. Use everywhere internal links are built. */
export function getProductUrl(p: SluggableProduct): string {
  return `/products/${getProductSlug(p)}`;
}

/**
 * Parse the trailing identifier token from a slug (the last hyphen-group).
 * Product stockNos ("STK…") and ids (numeric) contain no hyphens, so the final
 * segment is always the identifier — letting the route resolve without a scan.
 */
export function extractIdToken(slug: string): string {
  const parts = String(slug || '').split('-').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/** Site origin for absolute URLs (canonical, OG, sitemap, share, email).
 *  Env-driven so local dev never leaks localhost into indexable metadata. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ajmeramachines.com').replace(/\/+$/, '');
}

/** Absolute canonical product URL. */
export function getProductAbsoluteUrl(p: SluggableProduct): string {
  return `${getSiteUrl()}${getProductUrl(p)}`;
}
