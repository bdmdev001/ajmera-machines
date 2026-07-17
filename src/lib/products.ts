import dbConnect from '@/lib/dbConnect';
import Product, { type IProduct } from '@/models/Product';
import { imageUrl, normalizeImages, type ImageRef } from '@/lib/images';
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
    createdAt: p.createdAt,
  };
}

/**
 * Latest machines for the homepage grid. Prefers live MongoDB data; falls
 * back to the bundled seed so the page is never empty during local dev.
 */
export async function getFeaturedProducts(limit = 6): Promise<IProduct[]> {
  try {
    await dbConnect();
    const docs = await Product.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    if (docs.length > 0) return docs.map((d) => normalize(d as unknown as IProduct));
  } catch (error) {
    console.error('getFeaturedProducts: DB unavailable, using seed fallback.', error);
  }
  return seed.slice(0, limit).map(fromRaw);
}

/**
 * The full catalogue. Prefers live MongoDB; falls back to the bundled seed so
 * the stocklist always renders (and stays filterable) during local dev.
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

export interface FilterOptions {
  categories: string[];
  makes: string[];
  countries: string[];
  years: string[];
}

/** Distinct, sorted filter values from the catalogue for the Machine Finder. */
export function getFilterOptions(): FilterOptions {
  const cat = new Set<string>();
  const make = new Set<string>();
  const country = new Set<string>();
  const year = new Set<string>();
  for (const r of seed) {
    if (r.category?.trim()) cat.add(r.category.trim());
    if (r.make?.trim()) make.add(r.make.trim());
    if (r.country?.trim()) country.add(r.country.trim());
    if (r.myear?.trim()) year.add(r.myear.trim());
  }
  return {
    categories: Array.from(cat).sort(),
    makes: Array.from(make).sort(),
    countries: Array.from(country).sort(),
    years: Array.from(year).sort((a, b) => b.localeCompare(a)),
  };
}
