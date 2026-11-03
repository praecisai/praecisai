import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  PDF_BODY,
  PDF_CARD_BG,
  PDF_HAIRLINE,
  PDF_INK,
  PDF_MUTED,
  PDF_ROW_LINE,
  PDF_SEGMENT_COLORS,
  PdfTheme,
  drawPraecisLogo,
} from '../../common/utils/pdf-brand.util';

export interface StatementInvoice {
  billNo: string;
  billDate: string; // DD/MM/YYYY
  billAmount: number;
  dueAmount: number;
  daysOverdue: number;
  status: string; // per-invoice segment label
}

export interface StatementBusinessInfo {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  email?: string;
}

export interface StatementData {
  partyName: string;
  city?: string;
  agentName?: string;
  segment: string; // drives the color theme
  invoices: StatementInvoice[];
  // Business identity for the header/footer. Production sends always pass
  // the tenant's own; only the frozen demo flow omits it (Aeromen sample).
  business?: StatementBusinessInfo;
}

// The demo flow's identity (demo module is frozen and passes no business)
const DEMO_BUSINESS: StatementBusinessInfo = {
  name: 'AEROMEN CLOTHING LLP',
  addressLine1: 'C-Wing 19, 2nd Floor, Shree Beliram Industrial Estate,',
  addressLine2: 'Opp. Police Station, S.V. Road, Dahisar East, Mumbai - 400068',
  email: 'aeromenclothingllp@gmail.com',
};

const MARGIN = 40;
const HEADER_H = 24;
const ROW_H = 26;
const FOOTER_RESERVE = 70; // keep table rows clear of the footer line

const COLS = [
  { label: 'Bill No.', width: 125, align: 'left' as const },
  { label: 'Bill Date', width: 70, align: 'left' as const },
  { label: 'Bill Amt (Rs.)', width: 82, align: 'right' as const },
  { label: 'Due Amt (Rs.)', width: 82, align: 'right' as const },
  { label: 'Days', width: 46, align: 'right' as const },
  { label: 'Status', width: 110, align: 'left' as const },
];
const PAD = 6;

function inr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function dateStamp(): string {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
}

function themeFor(segment: string): PdfTheme {
  return PDF_SEGMENT_COLORS[segment] ?? PDF_SEGMENT_COLORS.Escalation;
}

@Injectable()
export class StatementPdfService {
  /**
   * Render the outstanding statement as a PDF buffer, in the same modern
   * layout as the recovery reports: left-aligned header with the Praecis AI
   * logo, KPI cards, a hairline invoice table with tinted status pills, and
   * page numbers on every page. The segment sets the one accent colour.
   * Uses "Rs." instead of the rupee glyph: pdfkit's built-in Helvetica
   * has no ₹ and embedding a font isn't worth it here.
   */
  async generate(data: StatementData): Promise<Buffer> {
    const theme = themeFor(data.segment);
    // Each tenant's own identity; a missing address or email is left out
    // rather than borrowed from another business.
    const source = data.business ?? DEMO_BUSINESS;
    const biz = {
      name: toTitle(source.name),
      addressLines: [source.addressLine1, source.addressLine2]
        .map((l) => l?.trim())
        .filter((l): l is string => !!l),
      email: source.email?.trim() || '',
    };

    // bufferPages lets the footer write "Page X of Y" once everything is laid out
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = MARGIN;
    const width = doc.page.width - MARGIN * 2;

    // ── Header: accent rule, eyebrow, business, address · logo + date ──
    const textW = width - 170;
    doc.roundedRect(left, 40, 26, 3, 1.5).fill(theme.accent);
    doc
      .fillColor(theme.accent).font('Helvetica-Bold').fontSize(8)
      .text('OUTSTANDING STATEMENT', left, 50, { width: textW, characterSpacing: 1.2, lineBreak: false });
    doc
      .fillColor(PDF_INK).font('Helvetica-Bold').fontSize(20)
      .text(biz.name, left, 64, { width: textW, lineBreak: false, ellipsis: true });
    let y = 90;
    doc.fillColor(PDF_MUTED).font('Helvetica').fontSize(8.5);
    for (const line of [...biz.addressLines, biz.email].filter(Boolean)) {
      doc.text(line, left, y, { width: textW });
      y = doc.y + 1;
    }

    drawPraecisLogo(doc, 48, 11);
    doc
      .fillColor(PDF_MUTED).font('Helvetica').fontSize(8)
      .text(`Statement date ${dateStamp()}`, left, 66, { width, align: 'right', lineBreak: false });

    y = Math.max(y, 104) + 10;
    doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.75).strokeColor(PDF_HAIRLINE).stroke();
    y += 16;

    // ── Who this is for ──
    doc
      .fillColor(PDF_MUTED).font('Helvetica-Bold').fontSize(7.5)
      .text('STATEMENT FOR', left, y, { characterSpacing: 0.9, lineBreak: false });
    doc
      .fillColor(PDF_INK).font('Helvetica-Bold').fontSize(13)
      .text(data.partyName, left, y + 13, { width });
    const meta = [data.city ? `City: ${data.city}` : '', data.agentName ? `Agent: ${data.agentName}` : '']
      .filter(Boolean)
      .join('   ·   ');
    y = doc.y + 2;
    if (meta) {
      doc.fillColor(PDF_MUTED).font('Helvetica').fontSize(8.5).text(meta, left, y, { width });
      y = doc.y;
    }
    y += 14;

    // ── KPI cards ──
    const totalDue = data.invoices.reduce((s, i) => s + i.dueAmount, 0);
    const totalBill = data.invoices.reduce((s, i) => s + i.billAmount, 0);
    const oldestDays = Math.max(...data.invoices.map((i) => i.daysOverdue), 0);
    y = this.drawKpis(doc, y, width, theme, [
      { label: 'Total outstanding', value: `Rs. ${inr(totalDue)}`, accent: true },
      { label: 'Invoices', value: String(data.invoices.length) },
      { label: 'Oldest bill', value: `${oldestDays} days` },
    ]);

    // ── Invoice table ──
    doc
      .fillColor(PDF_MUTED).font('Helvetica-Bold').fontSize(7.5)
      .text('OUTSTANDING INVOICES', left, y, { characterSpacing: 0.9, lineBreak: false });
    y += 16;

    const drawHeader = (rowY: number) => {
      let x = left;
      for (const col of COLS) {
        doc
          .fillColor(PDF_MUTED).font('Helvetica-Bold').fontSize(7)
          .text(col.label.toUpperCase(), x + PAD, rowY + 8, {
            width: col.width - PAD * 2,
            align: col.align,
            characterSpacing: 0.6,
            lineBreak: false,
          });
        x += col.width;
      }
      doc
        .moveTo(left, rowY + HEADER_H).lineTo(left + width, rowY + HEADER_H)
        .lineWidth(0.9).strokeColor(PDF_HAIRLINE).stroke();
    };

    drawHeader(y);
    y += HEADER_H;

    data.invoices.forEach((inv, idx) => {
      // The last row also needs room for the total, so the two stay together
      const need = idx === data.invoices.length - 1 ? ROW_H * 2 + 4 : ROW_H;
      if (y + need > doc.page.height - FOOTER_RESERVE) {
        doc.addPage();
        y = MARGIN;
        drawHeader(y);
        y += HEADER_H;
      }
      const cells = [inv.billNo, inv.billDate, inr(inv.billAmount), inr(inv.dueAmount), String(inv.daysOverdue)];
      let x = left;
      cells.forEach((cell, i) => {
        doc
          .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
          .fillColor(i === 0 ? PDF_INK : PDF_BODY)
          .text(cell, x + PAD, y + 9, { width: COLS[i].width - PAD * 2, align: COLS[i].align, lineBreak: false, ellipsis: true });
        x += COLS[i].width;
      });
      // Status as a tinted pill in that invoice's own segment colour
      const pillTheme = themeFor(inv.status);
      doc.font('Helvetica-Bold').fontSize(7.5);
      const label = inv.status.toUpperCase();
      const pillW = Math.min(doc.widthOfString(label) + 14, COLS[5].width - PAD * 2);
      doc.roundedRect(x + PAD, y + 5.5, pillW, 15, 7.5).fill(pillTheme.tint);
      doc.fillColor(pillTheme.accent).text(label, x + PAD + 7, y + 9.5, { width: pillW - 14, lineBreak: false, ellipsis: true });

      y += ROW_H;
      doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).strokeColor(PDF_ROW_LINE).stroke();
    });

    // Total row on a soft card
    if (y + ROW_H > doc.page.height - FOOTER_RESERVE) {
      doc.addPage();
      y = MARGIN;
    }
    doc.roundedRect(left, y + 4, width, ROW_H, 6).fill(PDF_CARD_BG);
    doc.fillColor(PDF_INK).font('Helvetica-Bold').fontSize(8.5);
    doc.text('TOTAL', left + PAD, y + 13, { width: COLS[0].width + COLS[1].width - PAD * 2, lineBreak: false });
    const billX = left + COLS[0].width + COLS[1].width;
    doc.text(inr(totalBill), billX + PAD, y + 13, { width: COLS[2].width - PAD * 2, align: 'right', lineBreak: false });
    doc
      .fillColor(theme.accent)
      .text(inr(totalDue), billX + COLS[2].width + PAD, y + 13, { width: COLS[3].width - PAD * 2, align: 'right', lineBreak: false });
    y += ROW_H + 22;

    // ── Payment note ──
    const note = `Kindly arrange payment for the above outstanding invoices at the earliest.${biz.email ? ` For any queries, please contact us at ${biz.email}.` : ''}`;
    doc.font('Helvetica').fontSize(9);
    const noteH = doc.heightOfString(note, { width: width - 36 }) + 24;
    if (y + noteH > doc.page.height - FOOTER_RESERVE) {
      doc.addPage();
      y = MARGIN;
    }
    doc.roundedRect(left, y, width, noteH, 8).fill(theme.tint);
    doc.roundedRect(left, y, 4, noteH, 2).fill(theme.accent);
    doc.fillColor(PDF_INK).text(note, left + 18, y + 12, { width: width - 36 });

    this.drawFooters(doc, biz.name);
    doc.end();
    return done;
  }

  /** Row of equal-width rounded KPI cards (same look as the reports). */
  private drawKpis(
    doc: PDFKit.PDFDocument,
    y: number,
    width: number,
    theme: PdfTheme,
    kpis: Array<{ label: string; value: string; accent?: boolean }>,
  ): number {
    const gap = 12;
    const h = 58;
    const cardW = (width - gap * (kpis.length - 1)) / kpis.length;
    kpis.forEach((k, i) => {
      const x = MARGIN + i * (cardW + gap);
      doc.roundedRect(x, y, cardW, h, 8).lineWidth(0.75).fillAndStroke(k.accent ? theme.tint : PDF_CARD_BG, PDF_HAIRLINE);
      if (k.accent) doc.roundedRect(x + 14, y + 12, 6, 6, 3).fill(theme.accent);
      doc
        .fillColor(PDF_MUTED).font('Helvetica-Bold').fontSize(7)
        .text(k.label.toUpperCase(), x + (k.accent ? 26 : 14), y + 12, {
          width: cardW - 40,
          characterSpacing: 0.8,
          lineBreak: false,
        });
      doc
        .fillColor(k.accent ? theme.accent : PDF_INK).font('Helvetica-Bold').fontSize(17)
        .text(k.value, x + 14, y + 27, { width: cardW - 28, lineBreak: false, ellipsis: true });
    });
    return y + h + 20;
  }

  /** Hairline + business name on the left, "Page X of Y" on the right, every page. */
  private drawFooters(doc: PDFKit.PDFDocument, businessName: string) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const width = doc.page.width - MARGIN * 2;
      const y = doc.page.height - 48;
      // Writing below the bottom margin would otherwise push a blank page
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + width, y).lineWidth(0.5).strokeColor(PDF_HAIRLINE).stroke();
      doc
        .fillColor(PDF_MUTED).font('Helvetica').fontSize(7)
        .text(`${businessName}  ·  Outstanding statement  ·  Computer-generated statement`, MARGIN, y + 8, {
          width: width - 80,
          lineBreak: false,
        });
      doc
        .fillColor(PDF_MUTED).font('Helvetica-Bold').fontSize(7)
        .text(`Page ${i - range.start + 1} of ${range.count}`, MARGIN, y + 8, { width, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
  }
}

function toTitle(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w === 'llp' ? 'LLP' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
