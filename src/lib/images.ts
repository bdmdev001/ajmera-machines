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

/* ============================================================================
   Cloudinary delivery transforms — inject f_auto (modern format: AVIF/WebP),
   q_auto (perceptual compression) and an explicit width so the browser never
   downloads a multi-megapixel original for a small rendered box. Pure string
   work, so this stays client-safe (no SDK import).
   ========================================================================= */

export interface CldOpts {
  /** Target intrinsic width in px. */
  width?: number;
  /** Target intrinsic height in px (pair with crop:'fill' for fixed boxes). */
  height?: number;
  /** Cloudinary crop mode. 'limit' = never upscale (default when only width). */
  crop?: 'fill' | 'limit' | 'fit' | 'scale';
  /** Quality: 'auto' (default) or a fixed 1–100. */
  quality?: number | 'auto';
}

const CLD_UPLOAD = '/image/upload/';

/** True for a Cloudinary delivery URL we can safely rewrite. */
function isCloudinary(url: string): boolean {
  return /res\.cloudinary\.com/i.test(url) && url.includes(CLD_UPLOAD);
}

/**
 * Resolve a reference to an OPTIMIZED Cloudinary URL. Non-Cloudinary URLs
 * (placeholder, legacy local paths) are returned untouched.
 */
export function cldUrl(ref: ImageRef, opts: CldOpts = {}): string {
  const url = imageUrl(ref);
  if (!isCloudinary(url)) return url;
  const t: string[] = ['f_auto', `q_${opts.quality ?? 'auto'}`];
  if (opts.width) t.push(`w_${opts.width}`);
  if (opts.height) t.push(`h_${opts.height}`);
  t.push(`c_${opts.crop ?? (opts.width && opts.height ? 'fill' : 'limit')}`);
  return url.replace(CLD_UPLOAD, `${CLD_UPLOAD}${t.join(',')}/`);
}

/** Build a width-descriptor srcset for responsive <img srcset>. */
export function cldSrcSet(ref: ImageRef, widths: number[], opts: Omit<CldOpts, 'width'> = {}): string {
  const url = imageUrl(ref);
  if (!isCloudinary(url)) return '';
  return widths.map((w) => `${cldUrl(ref, { ...opts, width: w })} ${w}w`).join(', ');
}
