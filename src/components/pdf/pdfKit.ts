import type { jsPDF } from 'jspdf';

/* ============================================================================
   PDF design tokens — premium industrial catalogue palette (user-specified).
   All colours are RGB tuples so they can be spread into jsPDF setters.
   ========================================================================= */
export type RGB = [number, number, number];

export const C = {
  primary: [15, 118, 110] as RGB, // #0F766E
  accent: [20, 184, 166] as RGB, // #14B8A6
  white: [255, 255, 255] as RGB, // #FFFFFF
  light: [248, 250, 252] as RGB, // #F8FAFC
  border: [229, 231, 235] as RGB, // #E5E7EB
  text: [17, 24, 39] as RGB, // #111827
  muted: [107, 114, 128] as RGB, // #6B7280
  accentSoft: [236, 253, 250] as RGB, // very light teal wash
  primarySoft: [240, 253, 250] as RGB,
};

/* A4 geometry in millimetres. */
export const PAGE = {
  W: 210,
  H: 297,
  MX: 14, // side margin
  MT: 14, // top margin
  MB: 18, // bottom margin (footer sits inside this band)
};
export const CONTENT_W = PAGE.W - PAGE.MX * 2; // 182mm
/** Baseline for flowing content on pages ≥ 2. */
export const FLOW_BOTTOM = PAGE.H - PAGE.MB - 6;

/** pt → mm helper (jsPDF positions are mm, font sizes are pt). */
const PT_TO_MM = 0.352778;
export const lineHeight = (sizePt: number, factor = 1.28) => sizePt * PT_TO_MM * factor;

interface TextOpts {
  size?: number;
  weight?: 'normal' | 'bold' | 'italic';
  color?: RGB;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
  lh?: number;
  letterSpacing?: number;
}

interface CardOpts {
  radius?: number;
  fill?: RGB | null;
  stroke?: RGB | null;
  lineWidth?: number;
  shadow?: boolean;
}

/* ============================================================================
   PdfKit — a thin, reusable wrapper over jsPDF that owns the flow cursor and
   the primitives every section is built from (cards, pills, icons, headings).
   ========================================================================= */
export class PdfKit {
  doc: jsPDF;
  y = PAGE.MT;

  constructor(doc: jsPDF) {
    this.doc = doc;
    doc.setFont('helvetica', 'normal');
  }

  /* ---- low-level colour helpers -------------------------------------- */
  private fill(rgb: RGB) { this.doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
  private stroke(rgb: RGB) { this.doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
  private ink(rgb: RGB) { this.doc.setTextColor(rgb[0], rgb[1], rgb[2]); }

  private withOpacity(opacity: number, draw: () => void) {
    const anyDoc = this.doc as unknown as { GState?: (o: { opacity: number }) => unknown; setGState?: (s: unknown) => void };
    if (anyDoc.GState && anyDoc.setGState) {
      anyDoc.setGState(anyDoc.GState({ opacity }));
      draw();
      anyDoc.setGState(anyDoc.GState({ opacity: 1 }));
    } else {
      draw();
    }
  }

  /* ---- cards & surfaces ---------------------------------------------- */
  card(x: number, y: number, w: number, h: number, opts: CardOpts = {}) {
    const { radius = 3.2, fill = C.white, stroke = C.border, lineWidth = 0.3, shadow = false } = opts;
    if (shadow) {
      this.withOpacity(0.05, () => {
        this.fill(C.text);
        this.doc.roundedRect(x + 0.5, y + 1.4, w, h, radius, radius, 'F');
      });
    }
    if (fill) this.fill(fill);
    if (stroke) { this.stroke(stroke); this.doc.setLineWidth(lineWidth); }
    const style = fill && stroke ? 'FD' : fill ? 'F' : 'S';
    this.doc.roundedRect(x, y, w, h, radius, radius, style);
  }

  /** Accent strip on the left edge of a card (used as a lightweight "icon" rail). */
  accentRail(x: number, y: number, h: number, width = 1.4, color: RGB = C.accent) {
    this.fill(color);
    this.doc.roundedRect(x, y + 1.2, width, h - 2.4, width / 2, width / 2, 'F');
  }

  /* ---- text ---------------------------------------------------------- */
  text(str: string, x: number, y: number, opts: TextOpts = {}): number {
    const { size = 10, weight = 'normal', color = C.text, align = 'left', maxWidth, lh, letterSpacing } = opts;
    this.doc.setFont('helvetica', weight);
    this.doc.setFontSize(size);
    this.ink(color);
    if (letterSpacing) this.doc.setCharSpace(letterSpacing);
    const step = lh ?? lineHeight(size);
    let consumed: number;
    if (maxWidth) {
      const lines = this.doc.splitTextToSize(str, maxWidth) as string[];
      lines.forEach((ln, i) => this.doc.text(ln, x, y + i * step, { align }));
      consumed = lines.length * step;
    } else {
      this.doc.text(str, x, y, { align });
      consumed = step;
    }
    if (letterSpacing) this.doc.setCharSpace(0);
    return consumed;
  }

  /** Measure how tall a wrapped string will be without drawing it. */
  measure(str: string, size: number, weight: 'normal' | 'bold' | 'italic', maxWidth: number, lh?: number): { lines: string[]; height: number } {
    this.doc.setFont('helvetica', weight);
    this.doc.setFontSize(size);
    const lines = this.doc.splitTextToSize(str, maxWidth) as string[];
    return { lines, height: lines.length * (lh ?? lineHeight(size)) };
  }

  textWidth(str: string, size: number, weight: 'normal' | 'bold' | 'italic' = 'normal'): number {
    this.doc.setFont('helvetica', weight);
    this.doc.setFontSize(size);
    return this.doc.getTextWidth(str);
  }

  /* ---- pills / chips ------------------------------------------------- */
  pill(x: number, y: number, label: string, opts: { fill?: RGB; textColor?: RGB; stroke?: RGB; size?: number; icon?: boolean } = {}): number {
    const { fill = C.accentSoft, textColor = C.primary, stroke = null, size = 8.2, icon = false } = opts;
    const padX = 4;
    const iconGap = icon ? 4.4 : 0;
    const tw = this.textWidth(label, size, 'bold');
    const w = tw + padX * 2 + iconGap;
    const h = 6.6;
    this.fill(fill);
    if (stroke) { this.stroke(stroke); this.doc.setLineWidth(0.3); this.doc.roundedRect(x, y, w, h, h / 2, h / 2, 'FD'); }
    else this.doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
    let tx = x + padX;
    if (icon) { this.checkMark(x + padX, y + h / 2, 2.6, textColor); tx += iconGap; }
    this.text(label, tx, y + h / 2 + 1.5, { size, weight: 'bold', color: textColor });
    return w;
  }

  /* ---- check mark (vector; core fonts can't render ✓) ---------------- */
  checkMark(cx: number, cyMid: number, size: number, color: RGB = C.accent) {
    this.stroke(color);
    this.doc.setLineWidth(0.6);
    const s = size;
    this.doc.line(cx, cyMid + s * 0.05, cx + s * 0.4, cyMid + s * 0.5);
    this.doc.line(cx + s * 0.4, cyMid + s * 0.5, cx + s * 1.05, cyMid - s * 0.55);
  }

  /* ---- section heading (pages ≥ 2) ----------------------------------- */
  sectionTitle(label: string, kicker?: string) {
    this.ensure(kicker ? 20 : 15);
    const x = PAGE.MX;
    this.fill(C.accent);
    this.doc.roundedRect(x, this.y - 3.4, 2.2, 7.2, 1.1, 1.1, 'F');
    this.text(label.toUpperCase(), x + 6, this.y + 1.4, { size: 13.5, weight: 'bold', color: C.primary, letterSpacing: 0.3 });
    if (kicker) {
      this.text(kicker, x + 6, this.y + 6.6, { size: 8.6, weight: 'normal', color: C.muted });
      this.y += 6.6;
    }
    this.y += 6.5;
    this.stroke(C.border);
    this.doc.setLineWidth(0.3);
    this.doc.line(x, this.y, PAGE.W - PAGE.MX, this.y);
    this.y += 7;
  }

  divider(x: number, y: number, w: number, color: RGB = C.border, weight = 0.3) {
    this.stroke(color);
    this.doc.setLineWidth(weight);
    this.doc.line(x, y, x + w, y);
  }

  /* ---- flow helpers -------------------------------------------------- */
  ensure(needed: number, onNewPage?: () => void) {
    if (this.y + needed > FLOW_BOTTOM) {
      this.doc.addPage();
      this.y = PAGE.MT + 2;
      onNewPage?.();
    }
  }

  /* ---- images -------------------------------------------------------- */
  /** Draw an image "contain"-fitted and centred inside a box. */
  imageContain(dataUrl: string, format: 'JPEG' | 'PNG', box: { x: number; y: number; w: number; h: number }, natural: { width: number; height: number }, pad = 0) {
    const availW = box.w - pad * 2;
    const availH = box.h - pad * 2;
    const r = Math.min(availW / natural.width, availH / natural.height);
    const iw = natural.width * r;
    const ih = natural.height * r;
    this.doc.addImage(dataUrl, format, box.x + (box.w - iw) / 2, box.y + (box.h - ih) / 2, iw, ih, undefined, 'FAST');
  }
}
