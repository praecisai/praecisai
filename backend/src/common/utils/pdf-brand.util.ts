// Shared look for every PDF PraecisAI generates (recovery reports, WhatsApp
// statements): the logo, the neutral palette and the segment colours, so the
// documents a customer receives match the reports their team downloads.

export interface PdfTheme {
  accent: string;
  tint: string;
}

export const PDF_INK = '#111827';
export const PDF_BODY = '#374151';
export const PDF_MUTED = '#6B7280';
export const PDF_HAIRLINE = '#E5E7EB';
export const PDF_ROW_LINE = '#F0F1F3';
export const PDF_CARD_BG = '#F9FAFB';

// Same segment hues as the dashboard, in a softer modern palette
export const PDF_SEGMENT_COLORS: Record<string, PdfTheme> = {
  'No Follow-up': { accent: '#64748B', tint: '#F1F5F9' },
  'Soft Reminder': { accent: '#059669', tint: '#ECFDF5' },
  'Follow-up': { accent: '#D97706', tint: '#FFFBEB' },
  'Strong Follow-up': { accent: '#EA580C', tint: '#FFF7ED' },
  Escalation: { accent: '#E11D48', tint: '#FFF1F2' },
};

// Praecis AI brand colours (from the logo): navy wordmark + blue "AI"
const BRAND_NAVY = '#0F1D35';
const BRAND_BLUE = '#3B63F3';

/** The logo's four-pointed sparkle star: concave sides via quadratic curves. */
export function drawSparkle(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number, color: string) {
  const k = r * 0.22; // waist: how far the concave sides bow toward the centre
  doc
    .save()
    .moveTo(cx, cy - r)
    .quadraticCurveTo(cx + k, cy - k, cx + r, cy)
    .quadraticCurveTo(cx + k, cy + k, cx, cy + r)
    .quadraticCurveTo(cx - k, cy + k, cx - r, cy)
    .quadraticCurveTo(cx - k, cy - k, cx, cy - r)
    .fill(color);
  doc.restore();
}

/** "✦ Praecis AI" wordmark, right-aligned at the given baseline area. */
export function drawPraecisLogo(doc: PDFKit.PDFDocument, yText: number, fontSize = 10) {
  doc.font('Helvetica-Bold').fontSize(fontSize);
  const praecisW = doc.widthOfString('Praecis');
  const spaceW = doc.widthOfString(' ');
  const aiW = doc.widthOfString('AI');
  const starR = fontSize * 0.55;
  const gap = 4;
  const right = doc.page.width - doc.page.margins.right;
  const x = right - (starR * 2 + gap + praecisW + spaceW + aiW);
  drawSparkle(doc, x + starR, yText + fontSize * 0.38, starR, BRAND_NAVY);
  const xText = x + starR * 2 + gap;
  doc.fillColor(BRAND_NAVY).text('Praecis', xText, yText, { lineBreak: false });
  doc.fillColor(BRAND_BLUE).text('AI', xText + praecisW + spaceW, yText, { lineBreak: false });
}
