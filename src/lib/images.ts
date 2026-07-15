/* ============================================================================
   Image types + URL resolution (client-safe: no node/Cloudinary deps here).

   Canonical storage shape is a STRUCTURED object: { url, public_id }.
   Legacy documents may still hold bare filename strings ("2010_1.jpeg") until
   the Cloudinary migration runs; the helpers below tolerate both so the UI
   never breaks mid-migration.
   ========================================================================= */

export interface ProductImage {
  url: string; // Cloudinary secure_url (or, for un-migrated data, a legacy filename)
  public_id: string; // Cloudinary public_id ('' for legacy/local images)
}

export const IMAGE_PLACEHOLDER = 'https://placehold.co/600x400/eef1f4/93a0af?text=Machine';

/** A single stored image reference — new object shape or legacy string. */
export type ImageRef = ProductImage | string | null | undefined;

/** Coerce any stored reference into the structured { url, public_id } shape. */
export function toProductImage(ref: ImageRef): ProductImage {
  if (!ref) return { url: '', public_id: '' };
  if (typeof ref === 'string') return { url: ref, public_id: '' };
  return { url: ref.url ?? '', public_id: ref.public_id ?? '' };
}

/** Normalize a mixed/legacy images array into ProductImage[] (drops empties). */
export function normalizeImages(images: ImageRef[] | undefined | null): ProductImage[] {
  if (!Array.isArray(images)) return [];
  return images.map(toProductImage).filter((im) => im.url);
}

/** Resolve a stored reference to a renderable <img src>. */
export function imageUrl(ref: ImageRef): string {
  const url = toProductImage(ref).url;
  if (!url) return IMAGE_PLACEHOLDER;
  if (/^https?:\/\//i.test(url)) return url; // Cloudinary (or any absolute URL)
  if (url.startsWith('/')) return url; // already root-relative
  return `/machines/${url}`; // legacy file in /public/machines
}
