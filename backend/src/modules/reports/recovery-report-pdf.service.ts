import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ReportEntry } from './reports.service';

// Mirrors the statement PDF's visual language (see statement-pdf.service.ts):
// colored band header, tinted total box, striped table.
const THEMES = {
  positive: { accent: '#2E7D32', tint: '#E8F5E9', title: 'POSITIVE RECOVERY REPORT' },
  negative: { accent: '#C62828', tint: '#FDEAEA', title: 'NEGATIVE RECOVERY REPORT' },
};

const INK = '#1F2937';
const MUTED = '#6B7280';

function inr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

@Injectable()
export class RecoveryReportPdfService {
  async generate(params: {
    type: 'positive' | 'negative';
    businessName: string;
    entries: ReportEntry[];
  }): Promise<Buffer> {
    const theme = THEMES[params.type];
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left * 2;

    // ── Header ──
    doc
      .fillColor(theme.accent)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(params.businessName.toUpperCase(), left, 36, { width: contentWidth, align: 'center' });

    let y = doc.y + 8;
    doc.rect(left, y, contentWidth, 24).fill(theme.accent);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(theme.title, left, y + 6, { width: contentWidth, align: 'center' });

    // ── Summary box ──
    y += 36;
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const totalDue = params.entries.reduce((s, e) => s + e.total_due, 0);

    doc.rect(left, y, contentWidth, 44).fill(theme.tint);
    doc.rect(left, y, 4, 44).fill(theme.accent);
    doc
      .fillColor(MUTED).font('Helvetica-Bold').fontSize(8)
      .text(params.type === 'positive' ? 'CUSTOMERS RESPONDING WELL' : 'CUSTOMERS NEEDING PERSONAL FOLLOW-UP', left + 16, y + 8);
    doc
      .fillColor(theme.accent).font('Helvetica-Bold').fontSize(15)
      .text(`${params.entries.length} customers  |  Rs.${inr(totalDue)} outstanding`, left + 16, y + 19);
    doc
      .fillColor(MUTED).font('Helvetica').fontSize(9)
      .text(`Generated on ${dateStr}`, left, y + 16, { width: contentWidth - 16, align: 'right' });

    // ── Table ──
    y += 60;
    const cols = [
      { label: 'Party', width: 170, align: 'left' as const },
      { label: 'City', width: 75, align: 'left' as const },
      { label: 'Phone', width: 85, align: 'left' as const },
      { label: 'Agent', width: 95, align: 'left' as const },
      { label: 'Due (Rs.)', width: 70, align: 'right' as const },
      { label: 'Calls', width: 36, align: 'right' as const },
      { label: 'Status', width: 105, align: 'left' as const },
      { label: 'Why', width: 134, align: 'left' as const },
    ];
    const rowH = 22;

    const drawHeader = (rowY: number) => {
      doc.rect(left, rowY, contentWidth, rowH).fill(theme.accent);
      let x = left;
      cols.forEach((col) => {
        doc
          .font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
          .text(col.label, x + 4, rowY + 7, { width: col.width - 8, align: col.align });
        x += col.width;
      });
    };

    drawHeader(y);
    y += rowH;

    params.entries.forEach((e, idx) => {
      if (y + rowH > doc.page.height - 50) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += rowH;
      }
      if (idx % 2 === 1) doc.rect(left, y, contentWidth, rowH).fill(theme.tint);

      const cells = [
        e.customer_name,
        e.city ?? '-',
        e.phone ?? '-',
        e.agent ?? '-',
        inr(e.total_due),
        String(e.total_calls),
        e.label,
        e.reason,
      ];
      let x = left;
      cells.forEach((cell, i) => {
        const col = cols[i];
        doc
          .font(i === 6 ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7.5)
          .fillColor(i === 6 ? theme.accent : INK)
          .text(cell, x + 4, y + 7, {
            width: col.width - 8,
            align: col.align,
            height: rowH - 8,
            ellipsis: true,
            lineBreak: false,
          });
        x += col.width;
      });
      y += rowH;
    });

    if (params.entries.length === 0) {
      doc
        .fillColor(MUTED).font('Helvetica').fontSize(10)
        .text('No customers fall into this report yet.', left, y + 12, {
          width: contentWidth,
          align: 'center',
        });
    }

    // ── Footer ── (lineBreak:false keeps it inside the bottom margin —
    // wrapped text past the margin would push a blank extra page)
    doc
      .fillColor(MUTED)
      .fontSize(7)
      .text(
        `${params.businessName} | Computer-generated recovery report: based on AI call outcomes.`,
        left,
        doc.page.height - 52,
        { width: contentWidth, align: 'center', lineBreak: false },
      );

    doc.end();
    return done;
  }
}
