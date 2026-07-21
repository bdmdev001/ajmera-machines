import { cache } from 'react';
import dbConnect from '@/lib/dbConnect';
import Product, { type IProduct } from '@/models/Product';
import { imageUrl, normalizeImages, type ImageRef } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import rawProducts from '@/data/products.json';

/**
 * Shape of the seed JSON (snake_case). Mapped to the camelCase IProduct used
 * across the UI so the site renders identically whether it is served from
 * MongoDB or the bundled seed file.
 */
interface RawProduct {
  id: string;
  stock_no: string;
  make: string;
  model: string;
  category: string;
  country: string;
  myear: string;
  title: string;
  technical_specifications: string;
  video_url: string;
  // Structured Cloudinary refs ({ url, public_id }); legacy string filenames
  // are still tolerated by the image helpers during any partial migration.
  images: ImageRef[];
}

const seed = rawProducts as RawProduct[];

function fromRaw(r: RawProduct): IProduct {
  return {
    id: String(r.id),
    stockNo: r.stock_no ?? '',
    title: r.title ?? '',
    make: r.make || 'N/A',
    model: r.model || 'N/A',
    category: r.category || 'N/A',
    country: r.country || 'N/A',
    myear: r.myear ?? '',
    videoUrl: r.video_url ?? '',
    technicalSpecifications: r.technical_specifications ?? '',
    images: normalizeImages(r.images),
    isFeatured: false,
    stockStatus: 'In Stock',
    badges: [],
  };
}

function normalize(p: IProduct): IProduct {
  return {
    id: String(p.id),
    stockNo: p.stockNo ?? '',
    title: p.title ?? '',
    make: p.make ?? 'N/A',
    model: p.model ?? 'N/A',
    category: p.category ?? 'N/A',
    country: p.country ?? 'N/A',
    myear: p.myear ?? '',
    videoUrl: p.videoUrl ?? '',
    technicalSpecifications: p.technicalSpecifications ?? '',
    images: normalizeImages(p.images),
    isFeatured: Boolean(p.isFeatured),
    stockStatus: p.stockStatus === 'Out of Stock' ? 'Out of Stock' : 'In Stock',
    badges: Array.isArray(p.badges) ? p.badges.filter((b) => typeof b === 'string' && b.trim()) : [],
    createdAt: p.createdAt,
  };
}

/**
 * Homepage "Featured" section — ONLY products an admin has explicitly marked
 * as featured (isFeatured). Newest featured first. There is deliberately no
 * "newest products" fallback: an unfeatured catalogue yields an empty section,
 * exactly as specified (nothing is ever auto-featured or hardcoded).
 */
export async function getFeaturedProducts(limit = 12): Promise<IProduct[]> {
  try {
    await dbConnect();
    const docs = await Product.find({ isFeatured: true }).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((d) => normalize(d as unknown as IProduct));
  } catch (error) {
    console.error('getFeaturedProducts: DB unavailable.', error);
    return [];
  }
}

/**
 * Homepage "Latest Arrivals" — fully automatic, like a standard e-commerce
 * store: the newest `limit` products by creation date, descending. No manual
 * flag, no hardcoded ids. Newly-added products surface here automatically and
 * push the oldest out. Falls back to the bundled seed (newest first) only when
 * the DB is unavailable so the section is never empty during local dev.
 */
export async function getLatestArrivals(limit = 8): Promise<IProduct[]> {
  try {
    await dbConnect();
    const newest = await Product.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    if (newest.length > 0) return newest.map((d) => normalize(d as unknown as IProduct));
  } catch (error) {
    console.error('getLatestArrivals: DB unavailable, using seed fallback.', error);
  }
  return seed.slice(0, limit).map(fromRaw);
}

/**
 * The full catalogue. Prefers live MongoDB; falls back to the bundled seed so
 * the product list always renders (and stays filterable) during local dev.
 */
export async function getAllProducts(): Promise<IProduct[]> {
  try {
    await dbConnect();
    // Newest machines first by creation date (admin-added items surface at the top).
    const docs = await Product.find({}).sort({ createdAt: -1 }).lean();
    if (docs.length > 0) return docs.map((d) => normalize(d as unknown as IProduct));
  } catch (error) {
    console.error('getAllProducts: DB unavailable, using seed fallback.', error);
  }
  return seed.map(fromRaw);
}

/**
 * Resolve a single product by the identifier token parsed from an SEO slug —
 * the stockNo ("stk0002010") or, for legacy numeric URLs, the original id.
 * Uses the indexed `stockNo`/`id` fields (no full-collection scan). Request-
 * cached so the detail page + generateMetadata share one lookup. Falls back to
 * the bundled seed when the DB is unavailable (parity with the rest of the app).
 */
export const getProductByStockNo = cache(async (token: string): Promise<IProduct | null> => {
  const t = (token || '').trim();
  if (!t) return null;
  try {
    await dbConnect();
    const doc = await Product.findOne({
      $or: [{ stockNo: t.toUpperCase() }, { id: t }],
    }).lean();
    if (doc) return normalize(doc as unknown as IProduct);
  } catch (error) {
    console.error('getProductByStockNo: DB unavailable, using seed fallback.', error);
  }
  const lower = t.toLowerCase();
  const r = seed.find((s) => (s.stock_no || '').toLowerCase() === lower || String(s.id).toLowerCase() === lower);
  return r ? fromRaw(r) : null;
});

export interface CategoryStat {
  category: string;
  count: number;
  /** A representative machine image for the category card (Cloudinary ref) */
  image?: ImageRef;
}

/**
 * Aggregated category counts from the seed file (the catalogue source of
 * truth). Used to build the "Product Categories" cards with real inventory
 * numbers and a representative photo.
 */
export function getCategoryStats(): CategoryStat[] {
  const map = new Map<string, CategoryStat>();
  for (const r of seed) {
    const key = r.category?.trim();
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.image && r.images?.[0]) existing.image = r.images[0];
    } else {
      map.set(key, { category: key, count: 1, image: r.images?.[0] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function getTotalMachines(): number {
  return seed.length;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  category: string;
  image?: string;
  /** Precomputed SEO product URL so the client never rebuilds it. */
  href: string;
}

export interface SearchIndex {
  products: SearchSuggestion[];
  categories: string[];
  makes: string[];
}

/**
 * Compact, serializable index for search autocomplete. Built from the seed so
 * it is instant and DB-independent — passed from the server layout into the
 * client search box, which filters it locally as the user types.
 */
export function getSearchIndex(): SearchIndex {
  const products: SearchSuggestion[] = seed.map((r) => ({
    id: String(r.id),
    title: r.title,
    category: r.category,
    image: r.images?.[0] ? imageUrl(r.images[0]) : undefined,
    href: getProductUrl({ id: String(r.id), stockNo: r.stock_no, make: r.make, model: r.model, title: r.title }),
  }));
  const cat = new Set<string>();
  const make = new Set<string>();
  for (const r of seed) {
    if (r.category?.trim() && r.category !== 'N/A') cat.add(r.category.trim());
    if (r.make?.trim() && r.make !== 'N/A') make.add(r.make.trim());
  }
  return {
    products,
    categories: Array.from(cat).sort(),
    makes: Array.from(make).sort(),
  };
}

/* ============================================================================
   SIZE / CAPACITY — value extraction, normalization & the Machine-Finder index
   ----------------------------------------------------------------------------
   Machines store specs as freeform "Key : Value" lines in
   `technicalSpecifications` (size/capacity is sometimes also embedded in the
   title). We audit every product, classify each spec line as size- or
   capacity-related by its KEY, keep only real measurement VALUES (gated to
   dimensional / weight units, so rpm / HP / kW / degree noise is dropped), and
   normalize them so "500 mm" / "500mm" / "500 MM" collapse to one value.

   The finder is category → brand → size → capacity dependent. The index is one
   row per product {category, make, sizes, capacities}; the client filters it by
   the chosen category + brand to offer *relevant* suggestions — never a generic
   global list.
   ========================================================================= */

// Spec KEY classifiers — does a "Key : Value" line describe size vs capacity?
const CAP_KEY_RE = /capacity|\bload\b|tonnage|holding|drilling\s*capacity|cutting\s*capacity|production/i;
const SIZE_KEY_RE = /table|\bsize\b|length|width|height|depth|\bdia\b|diameter|dimension|work(?:ing)?\s*area|swing|stroke|travel|centre|center|throat|admit|magnet|chuck|wheel|spindle|ram\b|arm|distance|bed/i;

// VALUE gates — keep only real measurements; drop speeds / power / angles / volts.
const VALUE_UNIT_RE = /\d\s*(?:mm|cm|mtr|met(?:er|re)|inch|in\b|ft|ton(?:ne|s)?|kgs?|lbs?|gals?|gallons?|kn)\b|\d\s*[x×]\s*\d|\d\s*["']/i;
const VALUE_BAD_RE = /rpm|\bkw\b|\bhp\b|degree|°|rev|volt|kva|watt/i;

/** Tidy a raw spec value for display (trim, collapse spaces, drop trailing punctuation). */
function cleanValue(v: string): string {
  return v.trim().replace(/[\s,;.]+$/, '').replace(/\s+/g, ' ').replace(/×/g, 'x');
}

/** Normalized key so "500 mm" / "500mm" / "500 MM" (and ton/tons) dedupe & match as one. */
export function valueKey(v: string): string {
  return cleanValue(v)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/tons\b/g, 'ton')
    .replace(/tonnes\b/g, 'tonne');
}

function isMeasurement(v: string): boolean {
  return VALUE_UNIT_RE.test(v) && !VALUE_BAD_RE.test(v);
}

/** A single "Key : Value" measurement (value already cleaned & unit-gated). */
interface KeyedMeasure { key: string; value: string }

/** Split a raw value that packs several measurements ("600x300 / 800x400")
 *  into individual values. Never splits on comma (thousands separators). */
function splitValues(raw: string): string[] {
  return raw.split(/\s*\/\s*|\s+&\s+|\s+and\s+/i).map((x) => x.trim()).filter(Boolean);
}

/** Classify a product's spec lines (+ title) into keyed size / capacity
 *  measurements. Capacity is tested first so "Table Load Capacity" is a
 *  capacity, not a size. Multi-value cells are expanded (section 7). */
function classifyMeasures(p: Pick<IProduct, 'technicalSpecifications' | 'title'>): { size: KeyedMeasure[]; capacity: KeyedMeasure[] } {
  const size: KeyedMeasure[] = [];
  const capacity: KeyedMeasure[] = [];
  const push = (arr: KeyedMeasure[], key: string, raw: string) => {
    for (const part of splitValues(raw)) {
      const d = cleanValue(part);
      if (d && isMeasurement(d)) arr.push({ key: key.toLowerCase(), value: d });
    }
  };

  for (const line of (p.technicalSpecifications || '').split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim();
    if (!key || !val) continue;
    if (CAP_KEY_RE.test(key)) push(capacity, key, val);
    else if (SIZE_KEY_RE.test(key)) push(size, key, val);
  }

  // Mine the title too — presses / lathes often put tonnage or a table size there.
  const title = p.title || '';
  const cap = title.match(/(\d[\d.,]*)\s*(ton|tonne)s?\b/i);
  if (cap) push(capacity, 'capacity', `${cap[1]} ${cap[2][0].toUpperCase()}${cap[2].slice(1).toLowerCase()}`);
  const dim = title.match(/\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\s*mm/i);
  if (dim) push(size, 'size', dim[0]);

  return { size, capacity };
}

/** All normalized, deduped size & capacity VALUES for a product (used for
 *  matching — a product matches if ANY of its values equals the selection). */
export function extractSizeCapacity(
  p: Pick<IProduct, 'technicalSpecifications' | 'title'>,
): { sizes: string[]; capacities: string[] } {
  const { size, capacity } = classifyMeasures(p);
  const dedupe = (ms: KeyedMeasure[]) => {
    const m = new Map<string, string>();
    for (const it of ms) m.set(valueKey(it.value), it.value);
    return [...m.values()];
  };
  return { sizes: dedupe(size), capacities: dedupe(capacity) };
}

/** True when a product carries the selected Size value (normalized match). */
export function productMatchesSize(p: IProduct, size: string): boolean {
  const target = valueKey(size);
  return extractSizeCapacity(p).sizes.some((v) => valueKey(v) === target);
}

/** True when a product carries the selected Capacity value (normalized match). */
export function productMatchesCapacity(p: IProduct, capacity: string): boolean {
  const target = valueKey(capacity);
  return extractSizeCapacity(p).capacities.some((v) => valueKey(v) === target);
}

/** Title-case a raw spec key for display ("table size" -> "Table Size"). */
function titleCaseKey(k: string): string {
  return k.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Sort measurement strings by their leading number, then lexicographically. */
function byMeasure(a: string, b: string): number {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

/** Across a category's products, pick the dominant spec key (the one the most
 *  products share) and collect its deduped values — this is the category's
 *  Size (or Capacity) attribute + option list. */
function dominantAttribute(perProduct: KeyedMeasure[][]): { label: string; values: string[] } | null {
  const productCount = new Map<string, number>();
  const valuesByKey = new Map<string, Map<string, string>>();
  for (const measures of perProduct) {
    const keysSeen = new Set<string>();
    for (const m of measures) {
      if (!valuesByKey.has(m.key)) valuesByKey.set(m.key, new Map());
      valuesByKey.get(m.key)!.set(valueKey(m.value), m.value);
      keysSeen.add(m.key);
    }
    for (const k of keysSeen) productCount.set(k, (productCount.get(k) ?? 0) + 1);
  }
  if (productCount.size === 0) return null;
  const keys = [...productCount.keys()].sort(
    (a, b) => (productCount.get(b)! - productCount.get(a)!) || (valuesByKey.get(b)!.size - valuesByKey.get(a)!.size),
  );
  const top = keys[0];
  return { label: titleCaseKey(top), values: [...valuesByKey.get(top)!.values()].sort(byMeasure) };
}

/** Category-level finder entry: the Size/Capacity attribute label + options
 *  come ONLY from products in this category (null label ⇒ filter disabled). */
export interface FinderCategory {
  category: string;
  sizeLabel: string | null;
  sizes: string[];
  capacityLabel: string | null;
  capacities: string[];
}

/** Aggregate an already-loaded product list into the category-driven finder
 *  index (dominant Size/Capacity attribute + values per category). Pure — the
 *  homepage finder and the product-list sidebar both use this ONE function so
 *  their category-specific Size/Capacity labels stay identical. */
export function buildFinderCategories(products: IProduct[]): FinderCategory[] {
  const byCat = new Map<string, IProduct[]>();
  for (const p of products) {
    const c = (p.category || '').trim();
    if (!c || c === 'N/A') continue;
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(p);
  }

  const out: FinderCategory[] = [];
  for (const [category, prods] of byCat) {
    const measures = prods.map((p) => classifyMeasures(p));
    const size = dominantAttribute(measures.map((m) => m.size));
    const capacity = dominantAttribute(measures.map((m) => m.capacity));
    out.push({
      category,
      sizeLabel: size?.label ?? null,
      sizes: size?.values ?? [],
      capacityLabel: capacity?.label ?? null,
      capacities: capacity?.values ?? [],
    });
  }
  out.sort((a, b) => a.category.localeCompare(b.category));
  return out;
}

/** Build the category-driven Machine-Finder index (DB, seed fallback). */
export async function getFinderIndex(): Promise<FinderCategory[]> {
  return buildFinderCategories(await getAllProducts());
}
