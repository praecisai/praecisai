import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { paiseToRupeeString } from './billing-math.util';

// Warm brown palette mirroring the dashboard design system
const ACCENT = '#7F5539'; // mahogany
const TINT = '#EDE0D4'; // cream
const INK = '#1C1008';
const MUTED = '#B08968';

// Praecis AI brand colours (from the logo): navy wordmark + blue "AI"
const BRAND_NAVY = '#0F1D35';
const BRAND_BLUE = '#3B63F3';

export interface InvoiceLineItem {
  description: string;
  amount: number; // paise, ex-GST
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  invoiceDate: Date;
  billTo: {
    name: string;
    gstin?: string | null;
    email?: string | null;
  };
  lineItems: InvoiceLineItem[];
  taxableValue: number; // paise
  gst: number; // paise
  total: number; // paise
}

/**
 * GST tax invoice PDF for Praecis fees (onboarding + monthly subscription).
 * Same pdfkit approach as the statement/report PDFs. Uses "Rs." because
 * pdfkit's built-in Helvetica has no rupee glyph.
 */
@Injectable()
export class BillingInvoicePdfService {
  /** The logo's four-pointed sparkle star: concave sides via quadratic curves. */
  private drawSparkle(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number, color: string) {
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

  /** "✦ Praecis AI" wordmark, drawn with its top-left at (x, y). */
  private drawLogo(doc: PDFKit.PDFDocument, x: number, y: number) {
    const fontSize = 20;
    const starR = 10;
    const gap = 8;
    doc.font('Helvetica-Bold').fontSize(fontSize);
    const praecisW = doc.widthOfString('Praecis');
    const spaceW = doc.widthOfString(' ');
    this.drawSparkle(doc, x + starR, y + fontSize * 0.4, starR, BRAND_NAVY);
    const xText = x + starR * 2 + gap;
    doc.fillColor(BRAND_NAVY).text('Praecis', xText, y, { lineBreak: false });
    doc.fillColor(BRAND_BLUE).text('AI', xText + praecisW + spaceW, y, { lineBreak: false });
  }

  async generate(input: InvoicePdfInput): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = doc.page.margins.left;
    const width = doc.page.width - left * 2;

    // Header: the Praecis AI logo (sparkle star + wordmark) on white, with the
    // invoice meta on the right and a mahogany rule underneath.
    this.drawLogo(doc, left, 34);
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8.5)
      .text('AI Recovery Platform · praecisai.in', left, 60);
    doc
      .fillColor(ACCENT)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('TAX INVOICE', left, 30, { width, align: 'right' });
    doc
      .fillColor(INK)
      .font('Helvetica')
      .fontSize(9)
      .text(`Invoice No: ${input.invoiceNumber}`, left, 52, { width, align: 'right' })
      .text(`Date: ${formatDate(input.invoiceDate)}`, left, 64, { width, align: 'right' });
    doc
      .moveTo(left, 88)
      .lineTo(left + width, 88)
      .lineWidth(1.5)
      .strokeColor(ACCENT)
      .stroke();

    // Bill-to box
    let y = 116;
    doc.roundedRect(left, y, width, 64, 6).fill(TINT);
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text('BILLED TO', left + 14, y + 10);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(input.billTo.name, left + 14, y + 24);
    let metaY = y + 40;
    doc.font('Helvetica').fontSize(9).fillColor(INK);
    if (input.billTo.gstin) {
      doc.text(`GSTIN: ${input.billTo.gstin}`, left + 14, metaY);
      metaY += 12;
    }
    if (input.billTo.email) doc.text(input.billTo.email, left + 14, metaY);

    // Line items table
    y += 88;
    const amountColW = 130;
    doc.rect(left, y, width, 24).fill(ACCENT);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text('DESCRIPTION', left + 12, y + 8);
    doc.text('AMOUNT (Rs.)', left + width - amountColW, y + 8, {
      width: amountColW - 12,
      align: 'right',
    });
    y += 24;

    input.lineItems.forEach((item, i) => {
      const rowH = 26;
      if (i % 2 === 1) doc.rect(left, y, width, rowH).fill('#F7EFE6');
      doc
        .fillColor(INK)
        .font('Helvetica')
        .fontSize(10)
        .text(item.description, left + 12, y + 8, { width: width - amountColW - 24 });
      doc.text(paiseToRupeeString(item.amount), left + width - amountColW, y + 8, {
        width: amountColW - 12,
        align: 'right',
      });
      y += rowH;
    });

    doc
      .moveTo(left, y)
      .lineTo(left + width, y)
      .lineWidth(0.5)
      .strokeColor(MUTED)
      .stroke();

    // Totals. The value column must line up exactly under the line-item
    // "AMOUNT (Rs.)" column: same right edge (left + width - 12) and width, so
    // every figure on the invoice shares one right margin.
    y += 12;
    const valueX = left + width - amountColW; // identical to the amount column
    const valueColW = amountColW - 12; // right edge = left + width - 12
    const totalsX = left + width - 280; // where the labels start
    const labelW = valueX - totalsX; // labels end where the value column begins
    const totalsRow = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 11 : 10)
        .fillColor(bold ? ACCENT : INK);
      doc.text(label, totalsX, y, { width: labelW });
      doc.text(value, valueX, y, { width: valueColW, align: 'right' });
      y += bold ? 20 : 16;
    };
    totalsRow('Taxable Value (Rs.)', paiseToRupeeString(input.taxableValue));
    totalsRow('GST @ 18% (Rs.)', paiseToRupeeString(input.gst));
    doc
      .roundedRect(totalsX - 10, y - 4, valueX + valueColW - totalsX + 10, 26, 4)
      .fill(TINT);
    totalsRow('TOTAL (Rs.)', paiseToRupeeString(input.total), true);

    // Footer
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(MUTED)
      .text(
        'This invoice covers PraecisAI platform fees only. Bolna and AiSensy usage is billed to you directly by those platforms.',
        left,
        doc.page.height - 80,
        { width, align: 'center' },
      )
      .text('Computer generated invoice: no signature required.', left, doc.page.height - 66, {
        width,
        align: 'center',
      });

    doc.end();
    return done;
  }
}

function formatDate(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return `${String(ist.getUTCDate()).padStart(2, '0')}/${String(ist.getUTCMonth() + 1).padStart(2, '0')}/${ist.getUTCFullYear()}`;
}
