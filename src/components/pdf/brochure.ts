import type { jsPDF } from 'jspdf';
import { PdfKit, PAGE, CONTENT_W, FLOW_BOTTOM, C, type RGB } from './pdfKit';
import type { LoadedImage } from './assets';

/* ============================================================================
   Premium product datasheet — vector layout (jsPDF).

   A clean, product-specific machine datasheet (no generic marketing content):
     • Page 1 — brand header, hero image + thumbnails, title, product summary
       (Stock/Category/Make/Model/Year/Country/Condition/Availability) and the
       product description.
     • Page 2 — the complete technical specifications as a two-column table that
       flows/auto-paginates, with the QR code (to the product page) at the end.
   The header, running header, footer and branding are unchanged. Composed of
   small single-responsibility "components"; buildBrochureDoc wires them together
   and is pure/sync so it can be smoke-tested outside the browser.
   ========================================================================= */

export interface Company {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  website: string; // display host, no protocol
  address: string;
}

export interface BrochureProduct {
  title: string;
  category: string;
  make: string;
  model: string;
  year?: string;
  country: string;
  stockNo: string;
  condition: string;
  availability: string;
}

export interface BrochureData {
  company: Company;
  product: BrochureProduct;
  description: string;
  specs: { label: string; value: string }[];
  notes: string[];
  productUrl: string;
  generatedDate: string;
}

export interface BrochureAssets {
  logo: LoadedImage | null;
  images: LoadedImage[]; // product images, [0] = hero
  qr: string; // QR PNG data URL
}

type IconKind =
  | 'stock' | 'category' | 'make' | 'model' | 'year' | 'country' | 'condition' | 'availability';

/* ------------------------------------------------------------------ *
 * Minimal vector field icons (drawn in accent, ~s mm).
 * ------------------------------------------------------------------ */
function fieldIcon(doc: jsPDF, kind: IconKind, x: number, y: number, s: number, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setFillColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.4);
  const cx = x + s / 2;
  const cy = y + s / 2;
  switch (kind) {
    case 'stock':
      doc.roundedRect(x + 0.6, y + 1.4, s - 2.4, s - 3, 0.7, 0.7, 'S');
      doc.circle(x + 2.2, y + 3.2, 0.45, 'S');
      break;
    case 'category':
      doc.line(x + 1, y + 2.2, x + s - 1, y + 2.2);
      doc.line(x + 1, y + s / 2, x + s - 1, y + s / 2);
      doc.line(x + 1, y + s - 2.2, x + s - 1, y + s - 2.2);
      break;
    case 'make':
      doc.roundedRect(x + 1, y + 3.2, s - 2, s - 4.6, 0.4, 0.4, 'S');
      doc.line(x + 1, y + 3.2, x + s / 2 - 0.4, y + 1.6);
      doc.line(x + s / 2 - 0.4, y + 1.6, x + s / 2 - 0.4, y + 3.2);
      break;
    case 'model':
      doc.roundedRect(x + 2, y + 2, s - 4, s - 4, 0.4, 0.4, 'S');
      doc.line(x + 3, y + 1, x + 3, y + 2);
      doc.line(x + s - 3, y + 1, x + s - 3, y + 2);
      doc.line(x + 3, y + s - 2, x + 3, y + s - 1);
      doc.line(x + s - 3, y + s - 2, x + s - 3, y + s - 1);
      break;
    case 'year':
      doc.roundedRect(x + 1, y + 2, s - 2, s - 3, 0.6, 0.6, 'S');
      doc.line(x + 1, y + 4, x + s - 1, y + 4);
      doc.line(x + 3, y + 1, x + 3, y + 2.6);
      doc.line(x + s - 3, y + 1, x + s - 3, y + 2.6);
      break;
    case 'country':
      doc.circle(cx, cy, (s - 2.2) / 2, 'S');
      doc.line(cx, y + 1.2, cx, y + s - 1.2);
      doc.line(x + 1.1, cy, x + s - 1.1, cy);
      break;
    case 'condition':
    case 'availability':
      doc.circle(cx, cy, (s - 2.2) / 2, 'S');
      doc.setLineWidth(0.55);
      doc.line(cx - 1.5, cy + 0.1, cx - 0.4, cy + 1.2);
      doc.line(cx - 0.4, cy + 1.2, cx + 1.6, cy - 1.4);
      break;
  }
}

/* ------------------------------------------------------------------ *
 * drawLogo — place the brand mark inside a height-defined box while
 * strictly preserving aspect ratio (never stretched). Returns the
 * rendered width so callers can flow content beside it.
 *
 * 'NONE' compression embeds the (already lossless) PNG verbatim — no
 * recompression, no downscaling, crisp on screen and at A4 print DPI.
 * ------------------------------------------------------------------ */
function drawLogo(doc: jsPDF, logo: LoadedImage, x: number, y: number, h: number, maxW = Infinity): number {
  const w = Math.min(maxW, h * (logo.width / logo.height));
  const drawH = w / (logo.width / logo.height); // shrink height in lock-step if maxW clamped the width
  doc.addImage(logo.dataUrl, logo.format, x, y, w, drawH, undefined, 'NONE');
  return w;
}

/* ================================================================== *
 * PDFHeader — brand block on page 1. The logo is the hero: rendered
 * large (~2×), aspect-locked and vertically centred against a compact
 * company/contact block on the right.
 * ================================================================== */
export function PDFHeader(kit: PdfKit, company: Company, assets: BrochureAssets) {
  const { doc } = kit;
  const x = PAGE.MX;
  const right = PAGE.W - PAGE.MX;

  // Accent top rule across the whole page.
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, PAGE.W, 2.6, 'F');

  const top = PAGE.MT + 2;
  const logoH = 18; // box height for the tightly-cropped wordmark (~15mm / 57px visible)
  let logoBottom = top + logoH;
  if (assets.logo) {
    // Cap the width so an unexpectedly wide asset can't crowd the contact block.
    const w = drawLogo(doc, assets.logo, x, top, logoH, 80);
    logoBottom = top + Math.min(logoH, w / (assets.logo.width / assets.logo.height));
  } else {
    kit.text(company.name, x, top + 12, { size: 20, weight: 'bold', color: C.primary });
    logoBottom = top + 16;
  }

  // Right-side company + contact block, vertically centred on the logo.
  const midY = top + logoH / 2;
  kit.text(company.name, right, midY - 5.4, { size: 14.5, weight: 'bold', color: C.text, align: 'right' });
  kit.text(company.tagline, right, midY, { size: 8.4, weight: 'normal', color: C.muted, align: 'right' });
  const contact = [company.website, company.phone, company.email].join('    •    ');
  kit.text(contact, right, midY + 6, { size: 8.6, weight: 'normal', color: C.muted, align: 'right' });

  // Elegant divider below the whole brand band: full-width hairline + accent tab.
  const dy = Math.max(logoBottom, midY + 9) + 5;
  kit.divider(x, dy, CONTENT_W, C.border, 0.3);
  doc.setFillColor(...C.accent);
  doc.rect(x, dy - 0.4, 32, 0.8, 'F');

  kit.y = dy + 7;
}

/* ================================================================== *
 * PDFHero — prominent featured image, title, badges.
 * ================================================================== */
export function PDFHero(kit: PdfKit, data: BrochureData, assets: BrochureAssets) {
  const { doc } = kit;
  const x = PAGE.MX;
  const top = kit.y;
  // A single image gets a larger, wider hero; with more images the hero is a
  // touch narrower to leave a balanced identity column. The remaining images
  // are shown in the integrated grid below (no separate gallery section).
  const single = assets.images.length <= 1;
  const leftW = single ? 104 : 86;
  const gap = 8;
  const rightX = x + leftW + gap;
  const rightW = CONTENT_W - leftW - gap;

  // --- Hero image card (the prominent featured image) ---
  const imgH = single ? 74 : 64;
  kit.card(x, top, leftW, imgH, { radius: 4, shadow: true, fill: C.white, stroke: C.border });
  const hero = assets.images[0];
  if (hero) {
    kit.imageContain(hero.dataUrl, hero.format, { x, y: top, w: leftW, h: imgH }, hero, 5);
  } else {
    kit.text('Image unavailable', x + leftW / 2, top + imgH / 2, { size: 9, color: C.muted, align: 'center' });
  }
  const leftBottom = top + imgH;

  // --- Right column ---
  let ry = top + 4;
  kit.text(data.product.category.toUpperCase(), rightX, ry, { size: 8.6, weight: 'bold', color: C.accent, letterSpacing: 0.5 });
  ry += 6;
  const titleH = kit.text(data.product.title, rightX, ry + 1, { size: 19, weight: 'bold', color: C.text, maxWidth: rightW, lh: 8 });
  ry += titleH + 1;
  doc.setFillColor(...C.accent);
  doc.rect(rightX, ry, 22, 1, 'F');
  ry += 6;

  const subline = [data.product.make, data.product.model, data.product.year]
    .filter((v) => v && v !== 'N/A').join('   ·   ');
  if (subline) {
    kit.text(subline, rightX, ry, { size: 9.4, weight: 'normal', color: C.muted, maxWidth: rightW });
    ry += 7.5;
  }

  // Status badges (wrap).
  const badges: string[] = [data.product.availability, data.product.condition, 'Export Ready'];
  if (data.product.country && data.product.country !== 'N/A') badges.push(data.product.country);
  let bx = rightX;
  let by = ry;
  const bGap = 4;
  badges.forEach((b) => {
    const w = kit.textWidth(b, 8.2, 'bold') + 8 + 4.4;
    if (bx + w > rightX + rightW) { bx = rightX; by += 8.6; }
    const used = kit.pill(bx, by, b, { fill: C.accentSoft, textColor: C.primary, icon: true });
    bx += used + bGap;
  });
  const rightBottom = by + 8.6;

  kit.y = Math.max(leftBottom, rightBottom) + 9;
}

/* ================================================================== *
 * ProductInfoGrid — 4×2 fact cards with icon chips.
 * ================================================================== */
export function ProductInfoGrid(kit: PdfKit, product: BrochureProduct) {
  const x = PAGE.MX;
  kit.text('KEY DETAILS', x, kit.y, { size: 9, weight: 'bold', color: C.primary, letterSpacing: 0.4 });
  kit.y += 5.5;

  const cards: { icon: IconKind; label: string; value: string }[] = [
    { icon: 'stock', label: 'Stock No.', value: product.stockNo || 'N/A' },
    { icon: 'category', label: 'Category', value: product.category || 'N/A' },
    { icon: 'make', label: 'Make', value: product.make || 'N/A' },
    { icon: 'model', label: 'Model', value: product.model || 'N/A' },
    { icon: 'year', label: 'Year', value: product.year || 'N/A' },
    { icon: 'country', label: 'Country', value: product.country || 'N/A' },
    { icon: 'condition', label: 'Condition', value: product.condition },
    { icon: 'availability', label: 'Availability', value: product.availability },
  ];

  const cols = 4;
  const gap = 4;
  const cardW = (CONTENT_W - gap * (cols - 1)) / cols;
  const chip = 8;
  const txOff = 4 + chip + 3.5;          // value/label x offset from card left
  const availW = cardW - txOff - 3;      // wrap width for the value text
  const valueSize = 11;
  const valueLH = 4.7;                   // mm per wrapped value line (11pt bold)
  const baseH = 17;                      // height of a single-line card
  const top = kit.y;

  // Pre-wrap every value at its REAL render size (jsPDF measures with the active
  // font size) so long values like "Grinder Tool Cutter" wrap to multiple lines
  // instead of being truncated. splitTextToSize also hard-breaks any single
  // token wider than the cell, so nothing can spill outside the card.
  kit.doc.setFont('helvetica', 'bold');
  kit.doc.setFontSize(valueSize);
  const wrapped = cards.map((c) => kit.doc.splitTextToSize(c.value || 'N/A', availW) as string[]);

  // Each row grows to fit its tallest card so rows never overlap.
  const rowCount = Math.ceil(cards.length / cols);
  const rowH: number[] = [];
  const rowY: number[] = [];
  let acc = top;
  for (let r = 0; r < rowCount; r += 1) {
    let maxLines = 1;
    for (let col = 0; col < cols; col += 1) {
      const idx = r * cols + col;
      if (idx < wrapped.length) maxLines = Math.max(maxLines, wrapped[idx].length);
    }
    rowH[r] = baseH + (maxLines - 1) * valueLH;
    rowY[r] = acc;
    acc += rowH[r] + gap;
  }

  cards.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + col * (cardW + gap);
    const cy = rowY[row];
    const h = rowH[row];
    kit.card(cx, cy, cardW, h, { radius: 2.8, fill: C.light, stroke: C.border, lineWidth: 0.3 });

    const lines = wrapped[i];
    // Vertically centre the label + value block (and the icon) within the card.
    const blockH = 3.2 + lines.length * valueLH;
    const blockTop = cy + (h - blockH) / 2;

    const chipX = cx + 4;
    const chipY = cy + (h - chip) / 2;
    kit.doc.setFillColor(...C.accentSoft);
    kit.doc.roundedRect(chipX, chipY, chip, chip, 2, 2, 'F');
    fieldIcon(kit.doc, c.icon, chipX + 1.2, chipY + 1.2, chip - 2.4, C.primary);

    const tx = cx + txOff;
    kit.text(c.label.toUpperCase(), tx, blockTop + 2.6, { size: 7, weight: 'bold', color: C.muted, letterSpacing: 0.2 });
    lines.forEach((ln, li) => kit.text(ln, tx, blockTop + 6.4 + li * valueLH, { size: valueSize, weight: 'bold', color: C.text }));
  });

  kit.y = rowY[rowCount - 1] + rowH[rowCount - 1] + 9;
}

/* ================================================================== *
 * Description card — flow-aware; self-sizes to its content and clamps
 * only if it would run past the page's footer band.
 * ================================================================== */
export function PDFDescription(kit: PdfKit, description: string, onNewPage: () => void) {
  const x = PAGE.MX;
  if (!description || !description.trim()) return;
  kit.ensure(26, onNewPage); // keep the heading with at least a few lines
  kit.text('DESCRIPTION', x, kit.y, { size: 9, weight: 'bold', color: C.primary, letterSpacing: 0.4 });
  kit.y += 5.5;

  const padX = 7;
  const padY = 6.5;
  const size = 9.6;
  const lh = 5.1;
  const { lines } = kit.measure(description, size, 'normal', CONTENT_W - padX * 2, lh);
  // Clamp so the card still finishes above the footer band on this page.
  const maxLines = Math.max(3, Math.floor((FLOW_BOTTOM - kit.y - padY * 2) / lh));
  const shown = lines.slice(0, maxLines);
  if (shown.length < lines.length) {
    shown[shown.length - 1] = `${shown[shown.length - 1].replace(/\s+\S*$/, '')} …`;
  }
  const cardH = shown.length * lh + padY * 2;
  kit.card(x, kit.y, CONTENT_W, cardH, { radius: 3.2, fill: C.white, stroke: C.border });
  kit.accentRail(x, kit.y, cardH, 1.4, C.accent);
  shown.forEach((ln, i) => kit.text(ln, x + padX, kit.y + padY + 3.4 + i * lh, { size, color: [55, 65, 81] }));
  kit.y += cardH + 8;
}

/* ================================================================== *
 * ProductImages — the remaining gallery images woven directly under the
 * hero as one contiguous imagery block (NO separate "Gallery" heading or
 * page). The column count adapts to how many images the product has, every
 * image keeps its aspect ratio (contain-fit inside its card), and rows
 * auto-flow onto the next page when there are many.
 * ================================================================== */
export function ProductImages(kit: PdfKit, images: LoadedImage[], onNewPage: () => void) {
  const extra = images.slice(1); // the featured image is already the hero
  if (extra.length === 0) return;

  const x = PAGE.MX;
  const gap = 6;
  // Balanced grids: a single extra sits at half width; 2 or 4 ⇒ 2 columns;
  // otherwise up to 3 columns. Every image keeps its aspect ratio (contain-fit).
  const cols = extra.length === 1 ? 1
    : (extra.length === 2 || extra.length === 4) ? 2
      : 3;
  const cellW = extra.length === 1 ? (CONTENT_W - gap) / 2 : (CONTENT_W - gap * (cols - 1)) / cols;
  const cellH = cellW * 0.7;

  extra.forEach((img, i) => {
    const col = i % cols;
    if (col === 0) kit.ensure(cellH + gap, onNewPage);
    const cx = x + col * (cellW + gap);
    kit.card(cx, kit.y, cellW, cellH, { radius: 3, fill: C.white, stroke: C.border });
    kit.imageContain(img.dataUrl, img.format, { x: cx, y: kit.y, w: cellW, h: cellH }, img, 3);
    if (col === cols - 1 || i === extra.length - 1) kit.y += cellH + gap;
  });
  kit.y += 4;
}

/* ================================================================== *
 * QRCodeCard — dedicated card, never floating.
 * ================================================================== */
export function QRCodeCard(kit: PdfKit, data: BrochureData, assets: BrochureAssets) {
  const x = PAGE.MX;
  const h = 40;
  kit.card(x, kit.y, CONTENT_W, h, { radius: 3.2, fill: C.primarySoft, stroke: C.border });

  // QR in a white sub-card.
  const qrBox = 30;
  const qx = x + 5;
  const qy = kit.y + (h - qrBox) / 2;
  kit.doc.setFillColor(...C.white);
  kit.doc.setDrawColor(...C.border);
  kit.doc.setLineWidth(0.3);
  kit.doc.roundedRect(qx, qy, qrBox, qrBox, 2.4, 2.4, 'FD');
  if (assets.qr) kit.doc.addImage(assets.qr, 'PNG', qx + 2, qy + 2, qrBox - 4, qrBox - 4, undefined, 'FAST');

  const tx = qx + qrBox + 8;
  let ty = kit.y + 11;
  kit.text('Scan to View Product', tx, ty, { size: 12.5, weight: 'bold', color: C.primary });
  ty += 6;
  kit.text('Open this machine online and enquire instantly —', tx, ty, { size: 8.8, color: C.muted });
  ty += 4.4;
  kit.text('condition photos, video and best price on request.', tx, ty, { size: 8.8, color: C.muted });
  ty += 6.5;
  kit.text(data.company.website, tx, ty, { size: 9.4, weight: 'bold', color: C.accent });

  kit.y += h + 8;
}

/* ================================================================== *
 * Running header for pages ≥ 2.
 * ================================================================== */
export function PDFRunningHeader(kit: PdfKit, data: BrochureData, assets: BrochureAssets) {
  const x = PAGE.MX;
  const top = PAGE.MT - 3;
  const logoH = 10; // consistent with the enlarged page-1 brand mark
  let logoBottom = top + logoH;
  if (assets.logo) {
    const w = drawLogo(kit.doc, assets.logo, x, top, logoH, 46);
    logoBottom = top + Math.min(logoH, w / (assets.logo.width / assets.logo.height));
  } else {
    kit.text(data.company.name, x, top + 8, { size: 12, weight: 'bold', color: C.primary });
  }
  const title = (kit.doc.splitTextToSize(`${data.product.title} · Stock ${data.product.stockNo}`, 118) as string[])[0];
  kit.text(title, PAGE.W - PAGE.MX, top + logoH / 2 + 1, { size: 9, weight: 'bold', color: C.muted, align: 'right' });
  const dy = Math.max(logoBottom, top + logoH) + 3.5;
  kit.divider(x, dy, CONTENT_W, C.border, 0.3);
  kit.y = dy + 7;
}

/* ================================================================== *
 * SpecificationTable — modern zebra table, auto-paginates.
 * ================================================================== */
export function SpecificationTable(kit: PdfKit, specs: { label: string; value: string }[], notes: string[], onNewPage: () => void) {
  const { doc } = kit;
  const x = PAGE.MX;
  const labelW = CONTENT_W * 0.4;
  const valX = x + labelW + 4;
  const valW = CONTENT_W - labelW - 8;

  const drawHead = () => {
    doc.setFillColor(...C.primary);
    doc.roundedRect(x, kit.y, CONTENT_W, 8.5, 2, 2, 'F');
    doc.setFillColor(...C.primary);
    doc.rect(x, kit.y + 3, CONTENT_W, 5.5, 'F');
    kit.text('SPECIFICATION', x + 5, kit.y + 5.6, { size: 8.4, weight: 'bold', color: C.white, letterSpacing: 0.4 });
    kit.text('VALUE', valX, kit.y + 5.6, { size: 8.4, weight: 'bold', color: C.white, letterSpacing: 0.4 });
    kit.y += 8.5;
  };

  if (specs.length === 0 && notes.length === 0) {
    kit.card(x, kit.y, CONTENT_W, 16, { radius: 2.6, fill: C.light, stroke: C.border });
    kit.text('Full specification sheet available on request.', x + 6, kit.y + 9.5, { size: 9, weight: 'normal', color: C.muted });
    kit.y += 16 + 8;
    return;
  }

  kit.ensure(8.5 + 11, () => { onNewPage(); });
  drawHead();

  specs.forEach((s, i) => {
    const labelLines = doc.splitTextToSize(s.label, labelW - 8) as string[];
    const valueLines = doc.splitTextToSize(s.value, valW) as string[];
    const rowH = Math.max(8.5, Math.max(labelLines.length, valueLines.length) * 4.6 + 3.4);
    kit.ensure(rowH, () => { onNewPage(); drawHead(); });
    if (i % 2 === 1) { doc.setFillColor(...C.light); doc.rect(x, kit.y, CONTENT_W, rowH, 'F'); }
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(x, kit.y + rowH, x + CONTENT_W, kit.y + rowH);
    labelLines.forEach((ln, li) => kit.text(ln, x + 5, kit.y + 5.4 + li * 4.6, { size: 9, weight: 'bold', color: [71, 85, 105] }));
    valueLines.forEach((ln, li) => kit.text(ln, valX, kit.y + 5.4 + li * 4.6, { size: 9, weight: 'normal', color: C.text }));
    kit.y += rowH;
  });

  notes.forEach((note) => {
    const noteLines = doc.splitTextToSize(note, CONTENT_W - 10) as string[];
    const rowH = noteLines.length * 4.4 + 4;
    kit.ensure(rowH, () => { onNewPage(); });
    noteLines.forEach((ln, li) => kit.text(ln, x + 5, kit.y + 5 + li * 4.4, { size: 8.6, weight: 'italic', color: C.muted }));
    kit.y += rowH;
  });

  // Rounded outline around the last table segment for a finished look.
  kit.y += 8;
}

/* ================================================================== *
 * PDFFooter — drawn on every page at the end.
 * ================================================================== */
export function PDFFooter(kit: PdfKit, data: BrochureData, assets: BrochureAssets) {
  const { doc } = kit;
  const pageCount = doc.getNumberOfPages();
  const x = PAGE.MX;
  const right = PAGE.W - PAGE.MX;

  const logoH = 11.5;              // visible mark ~9.7mm (≈37px) — within the 36–45px target
  const vCenter = PAGE.H - 10;     // vertical centre of the footer band
  const baseline = vCenter + 1.6;  // single shared text baseline for every zone
  const dividerY = PAGE.H - 19;
  const logoY = vCenter - logoH / 2;

  // Left cluster: enlarged wordmark (carries the AJMERA ENTERPRISE name) followed
  // by the contact line; page/date sit right-aligned. Everything on one baseline.
  const contact = `${data.company.website}  ·  ${data.company.phone}  ·  ${data.company.email}`;

  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    kit.divider(x, dividerY, CONTENT_W, C.border, 0.3);

    let textX = x;
    if (assets.logo) {
      const w = drawLogo(doc, assets.logo, x, logoY, logoH, 44);
      textX = x + w + 4;
    } else {
      kit.text(data.company.name, x, baseline, { size: 7.2, weight: 'bold', color: C.text });
      textX = x + kit.textWidth(data.company.name, 7.2, 'bold') + 4;
    }
    kit.text(contact, textX, baseline, { size: 7, weight: 'normal', color: C.muted });

    kit.text(`Page ${p} of ${pageCount}    ·    Generated ${data.generatedDate}`, right, baseline, { size: 7, weight: 'bold', color: C.text, align: 'right' });
  }
}

/* ================================================================== *
 * Orchestrator (pure / sync) — testable without a browser.
 * ================================================================== */
export function buildBrochureDoc(doc: jsPDF, data: BrochureData, assets: BrochureAssets) {
  const kit = new PdfKit(doc);
  // Running header drawn whenever the flowing content spills onto a new page.
  const runningHeader = () => PDFRunningHeader(kit, data, assets);

  // ---- Brand header (page 1) ----
  PDFHeader(kit, data.company, assets);

  // ---- Product identity: title + the prominent featured image ----
  PDFHero(kit, data, assets);

  // ---- Product summary (product-specific key details) ----
  ProductInfoGrid(kit, data.product);

  // ---- Remaining gallery images, integrated as a responsive grid that flows
  //      naturally onto following pages (no separate gallery section/page) ----
  ProductImages(kit, assets.images, runningHeader);

  // ---- Product description ----
  PDFDescription(kit, data.description, runningHeader);

  // ---- Complete technical specifications (two-column table, auto-paginates) ----
  kit.ensure(30, runningHeader);
  kit.sectionTitle('Technical Specifications', 'As documented for this machine');
  SpecificationTable(kit, data.specs, data.notes, runningHeader);

  // ---- QR to the product details page, at the end of the specifications ----
  kit.ensure(48, runningHeader);
  QRCodeCard(kit, data, assets);

  // ---- Footer (logo, contact, page numbering) on every page ----
  PDFFooter(kit, data, assets);
}
