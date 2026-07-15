import { buildBrochureDoc, type BrochureData, type BrochureAssets } from './brochure';
import { loadImage, loadImages } from './assets';

export interface BrochureSources {
  logoSrc: string;
  imageSrcs: string[];
}

/**
 * Browser entry point: preload every asset (logo, product images, QR) fully
 * BEFORE any drawing, then build the vector PDF and return a Blob.
 */
export async function generateBrochure(data: BrochureData, sources: BrochureSources): Promise<Blob> {
  const [{ jsPDF }, qrMod] = await Promise.all([import('jspdf'), import('qrcode')]);
  const QRCode = (qrMod as { default?: typeof import('qrcode') }).default ?? qrMod;

  const [logo, images, qr] = await Promise.all([
    loadImage(sources.logoSrc, { preserveAlpha: true }).catch(() => null),
    loadImages(sources.imageSrcs).then((list) => list.filter((x): x is NonNullable<typeof x> => !!x)),
    QRCode.toDataURL(data.productUrl, {
      margin: 0,
      width: 260,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F766E', light: '#FFFFFF' },
    }).catch(() => ''),
  ]);

  const assets: BrochureAssets = { logo, images, qr };
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  buildBrochureDoc(doc, data, assets);
  return doc.output('blob');
}
