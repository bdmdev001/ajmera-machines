import type { MetadataRoute } from 'next';
import { getAllProducts } from '@/lib/products';
import { getProductUrl, getSiteUrl } from '@/lib/productUrl';

/* XML sitemap. Product entries use ONLY the canonical SEO URLs
   (/products/{slug}-{stockNo}); no legacy numeric URLs are emitted. The origin
   comes from NEXT_PUBLIC_SITE_URL so local dev never publishes localhost URLs. */

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // getAllProducts already falls back to the bundled seed if the DB is down.
  const all = await getAllProducts();
  const products: MetadataRoute.Sitemap = all.map((p) => ({
    url: `${base}${getProductUrl(p)}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...products];
}
