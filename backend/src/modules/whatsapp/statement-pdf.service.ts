import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

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
  // Business identity for the header/footer; defaults to Aeromen
  business?: StatementBusinessInfo;
}

// Segment color themes: dark accent for bands/text, light tint for fills.
// Soft Reminder = light green, Follow-up = yellow, Strong Follow-up = orange,
// Escalation = red (matches the WhatsApp campaign per segment).
const SEGMENT_THEMES: Record<string, { accent: string; tint: string }> = {
  'Soft Reminder': { accent: '#2E7D32', tint: '#E8F5E9' },
  'Follow-up': { accent: '#B8860B', tint: '#FFF8DC' },
  'Strong Follow-up': { accent: '#E65100', tint: '#FFF3E0' },
  Escalation: { accent: '#C62828', tint: '#FDEAEA' },
};

const INK = '#1F2937';
const MUTED = '#6B7280';

// Business identity on the statement header. Hardcoded Aeromen for now: same
// approach as the demo call flow's business_name (see demo.service.ts).
const BUSINESS = {
  name: 'AEROMEN CLOTHING LLP',
  addressLine1: 'C-Wing 19, 2nd Floor, Shree Beliram Industrial Estate,',
  addressLine2: 'Opp. Police Station, S.V. Road, Dahisar East, Mumbai - 400068',
  email: 'aeromenclothingllp@gmail.com',
};

function inr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

@Injectable()
export class StatementPdfService {
  /**
   * Render the outstanding statement as a PDF buffer. Layout mirrors the
   * approved Aeromen sample: header, statement band, party block, total box,
   * invoice table with per-row status, and a polite footer.
   * Uses "Rs." instead of the rupee glyph: pdfkit's built-in Helvetica
   * has no ₹ and embedding a font isn't worth it here.
   */
  async generate(data: StatementData): Promise<Buffer> {
    const theme = SEGMENT_THEMES[data.segment] ?? SEGMENT_THEMES['Escalation'];
    const biz = {
      name: data.business?.name?.toUpperCase() || BUSINESS.name,
      addressLine1: data.business?.addressLine1 ?? BUSINESS.addressLine1,
      addressLine2: data.business?.addressLine2 ?? BUSINESS.addressLine2,
      email: data.business?.email ?? BUSINESS.email,
    };
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const contentWidth = pageWidth - left * 2;

    // ── Business header ──
    doc
      .fillColor(theme.accent)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(biz.name, left, 44, { width: contentWidth, align: 'center' });
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(biz.addressLine1, { width: contentWidth, align: 'center' })
      .text(biz.addressLine2, { width: contentWidth, align: 'center' });

    // ── Statement band ──
    let y = doc.y + 12;
    doc.rect(left, y, contentWidth, 26).fill(theme.accent);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('OUTSTANDING STATEMENT', left, y + 7, { width: contentWidth, align: 'center' });

    // ── Date + party block ──
    y += 38;
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dateStr = `${dd}/${mm}/${today.getFullYear()}`;

    doc.fillColor(INK).font('Helvetica').fontSize(10);
    doc.text(`Date: ${dateStr}`, left, y, { width: contentWidth, align: 'right' });
    if (data.agentName) doc.text(`Agent: ${data.agentName}`, left, y);
    doc.font('Helvetica-Bold').text(`Party: ${data.partyName}`, left, doc.y + 2);
    doc.font('Helvetica');
    if (data.city) doc.text(`City: ${data.city}`, left, doc.y + 2);

    // ── Total outstanding box ──
    const totalDue = data.invoices.reduce((s, i) => s + i.dueAmount, 0);
    const totalBill = data.invoices.reduce((s, i) => s + i.billAmount, 0);
    const oldestDays = Math.max(...data.invoices.map((i) => i.daysOverdue), 0);

    y = doc.y + 14;
    doc.rect(left, y, contentWidth, 58).fill(theme.tint);
    doc.rect(left, y, 4, 58).fill(theme.accent);
    doc
      .fillColor(MUTED)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('TOTAL OUTSTANDING', left + 18, y + 10);
    doc
      .fillColor(theme.accent)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(`Rs.${inr(totalDue)}`, left + 18, y + 23);
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `${data.invoices.length} invoice(s) | Oldest: ${oldestDays} days`,
        left + 18,
        y + 23 + 22,
      );

    // ── Invoice table ──
    y += 58 + 20;
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Outstanding Invoices', left, y);
    y = doc.y + 8;

    const cols = [
      { label: 'Bill No.', width: 120, align: 'left' as const },
      { label: 'Bill Date', width: 70, align: 'left' as const },
      { label: 'Bill Amt (Rs.)', width: 85, align: 'right' as const },
      { label: 'Due Amt (Rs.)', width: 85, align: 'right' as const },
      { label: 'Days', width: 45, align: 'right' as const },
      { label: 'Status', width: 110, align: 'center' as const },
    ];
    const rowH = 22;

    const drawRow = (
      cells: string[],
      rowY: number,
      opts: { header?: boolean; fill?: string; statusCol?: boolean } = {},
    ) => {
      if (opts.fill) doc.rect(left, rowY, contentWidth, rowH).fill(opts.fill);
      let x = left;
      cells.forEach((cell, i) => {
        const col = cols[i];
        const isStatus = opts.statusCol && i === 5 && cell;
        doc
          .font(opts.header || isStatus ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(opts.header ? 9 : 9)
          .fillColor(opts.header ? '#FFFFFF' : isStatus ? theme.accent : INK)
          .text(cell, x + 4, rowY + 7, { width: col.width - 8, align: col.align });
        x += col.width;
      });
    };

    doc.rect(left, y, contentWidth, rowH).fill(theme.accent);
    drawRow(cols.map((c) => c.label), y, { header: true });
    y += rowH;

    data.invoices.forEach((inv, idx) => {
      // New page if the table runs long
      if (y + rowH * 2 > doc.page.height - 100) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      drawRow(
        [
          inv.billNo,
          inv.billDate,
          inr(inv.billAmount),
          inr(inv.dueAmount),
          String(inv.daysOverdue),
          inv.status.toUpperCase(),
        ],
        y,
        { fill: idx % 2 === 0 ? '#FFFFFF' : theme.tint, statusCol: true },
      );
      y += rowH;
    });

    // Total row
    doc.rect(left, y, contentWidth, rowH).fill(theme.tint);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(INK)
      .text('TOTAL', left + 4, y + 7, { width: cols[0].width + cols[1].width - 8 });
    doc.text(inr(totalBill), left + cols[0].width + cols[1].width + 4, y + 7, {
      width: cols[2].width - 8,
      align: 'right',
    });
    doc.text(
      inr(totalDue),
      left + cols[0].width + cols[1].width + cols[2].width + 4,
      y + 7,
      { width: cols[3].width - 8, align: 'right' },
    );
    y += rowH + 18;

    // ── Footer ──
    doc
      .fillColor(INK)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Kindly arrange payment for the above outstanding invoices at the earliest. For any queries, please contact us at ${biz.email}`,
        left,
        y,
        { width: contentWidth },
      );

    doc
      .fillColor(MUTED)
      .fontSize(7.5)
      .text(
        `${toTitle(biz.name)} | ${biz.email} | ${biz.addressLine1} ${biz.addressLine2} | Computer-generated statement.`,
        left,
        doc.page.height - 70,
        { width: contentWidth, align: 'center' },
      );

    doc.end();
    return done;
  }
}

function toTitle(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w === 'llp' ? 'LLP' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
