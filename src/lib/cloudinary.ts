import { v2 as cloudinary, type UploadApiOptions } from 'cloudinary';
import type { ProductImage } from '@/lib/images';

/* ============================================================================
   Cloudinary SDK — configured from THREE discrete env vars only.

   Single, consistent style (no CLOUDINARY_URL):
     CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
   ========================================================================= */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'ajmera/machines';

/** True only when all three credentials resolved — lets routes fail loudly. */
export function isCloudinaryConfigured(): boolean {
  const c = cloudinary.config();
  return Boolean(c.cloud_name && c.api_key && c.api_secret);
}

/**
 * Upload an in-memory image buffer to Cloudinary and return only the pieces we
 * persist: the secure_url and the public_id. Rejects on any Cloudinary error so
 * callers can refuse to save a product with a broken image reference.
 */
export function uploadImageBuffer(buffer: Buffer, folder = UPLOAD_FOLDER): Promise<ProductImage> {
  return new Promise((resolve, reject) => {
    const options: UploadApiOptions = {
      folder,
      resource_type: 'image',
      unique_filename: true,
      overwrite: false,
    };
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err || !result) {
        reject(err instanceof Error ? err : new Error('Cloudinary upload returned no result'));
        return;
      }
      resolve({ url: result.secure_url, public_id: result.public_id });
    });
    stream.end(buffer);
  });
}

/** Best-effort delete of a Cloudinary asset by public_id (no-op if empty). */
export async function deleteImage(publicId?: string | null): Promise<void> {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

/** Delete many Cloudinary assets; never throws (errors are logged). */
export async function deleteImages(publicIds: (string | null | undefined)[]): Promise<void> {
  await Promise.all(
    publicIds.filter(Boolean).map((pid) =>
      deleteImage(pid).catch((e) => console.error('[cloudinary] delete failed for', pid, e)),
    ),
  );
}

export default cloudinary;
