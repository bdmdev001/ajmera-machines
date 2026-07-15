/* ============================================================================
   Client-side asset loading for the PDF brochure.

   The #1 bug being fixed here is images silently disappearing. The strategy:
   fully decode every image into a data URL (with a white matte) BEFORE any
   drawing happens, with a timeout so generation can never hang, and graceful
   nulls so one broken file never aborts the whole brochure.
   ========================================================================= */

export interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'JPEG' | 'PNG';
}

const LOAD_TIMEOUT = 12000;

export interface LoadImageOptions {
  /**
   * Keep the source alpha channel instead of flattening onto a white matte.
   * Product photos want the matte (transparent PNGs read as white on the page);
   * the brand logo wants its transparency preserved for crisp, print-safe edges.
   */
  preserveAlpha?: boolean;
}

export function loadImage(src: string, opts: LoadImageOptions = {}): Promise<LoadedImage> {
  const { preserveAlpha = false } = opts;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; reject(new Error(`Timed out loading ${src}`)); }
    }, LOAD_TIMEOUT);

    const finish = async () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        // Ensure the bitmap is actually decoded before we touch the canvas.
        if (typeof img.decode === 'function') { await img.decode().catch(() => {}); }
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) { reject(new Error(`Zero-size image ${src}`)); return; }
        // Never downscale: the canvas matches the source pixel dimensions so the
        // logo is embedded at full resolution (≫300 DPI at any sane print size).
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas unavailable')); return; }
        ctx.imageSmoothingEnabled = true;
        (ctx as CanvasRenderingContext2D & { imageSmoothingQuality?: string }).imageSmoothingQuality = 'high';
        const isPng = /\.png$/i.test(src);
        // A PNG with alpha keeps its transparency; everything else is flattened
        // onto white so stray transparency never shows through as black.
        const keepAlpha = preserveAlpha && isPng;
        if (!keepAlpha) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve({
          // PNG is lossless (the 0.9 quality arg only affects JPEG), so logo
          // edges are embedded without any compression artefacts.
          dataUrl: canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.92),
          width: w,
          height: h,
          format: isPng ? 'PNG' : 'JPEG',
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onload = () => { void finish(); };
    img.onerror = () => { if (!done) { done = true; clearTimeout(timer); reject(new Error(`Failed to load ${src}`)); } };
    img.src = src;
  });
}

/** Load many images, tolerating individual failures (returns null in place). */
export async function loadImages(srcs: string[]): Promise<(LoadedImage | null)[]> {
  return Promise.all(srcs.map((s) => loadImage(s).catch(() => null)));
}

export function sanitizeFileName(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
