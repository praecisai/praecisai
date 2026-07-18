import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { EscalationEntry, ReportEntry, SegmentOverviewSection } from './reports.service';

// Mirrors the statement PDF's visual language (see statement-pdf.service.ts):
// colored band header, tinted total box, striped table.
const THEMES = {
  positive: { accent: '#2E7D32', tint: '#E8F5E9', title: 'POSITIVE RECOVERY REPORT' },
  negative: { accent: '#C62828', tint: '#FDEAEA', title: 'NEGATIVE RECOVERY REPORT' },
};

// Same colours the dashboard uses for each segment
const SEGMENT_COLORS: Record<string, { accent: string; tint: string }> = {
  'No Follow-up': { accent: '#6B7280', tint: '#F1F2F4' },
  'Soft Reminder': { accent: '#2E7D32', tint: '#E8F5E9' },
  'Follow-up': { accent: '#B8860B', tint: '#F9F1DC' },
  'Strong Follow-up': { accent: '#E65100', tint: '#FDEEE2' },
  Escalation: { accent: '#C62828', tint: '#FDEAEA' },
};

const INK = '#1F2937';
const MUTED = '#6B7280';

const HEADER_H = 22;
const MIN_ROW_H = 22;

interface TableCol {
  label: string;
  width: number;
  align: 'left' | 'right';
}

function inr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function dateStamp(): string {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
}

function shortDate(d: Date | null): string {
  if (!d) return '-';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

@Injectable()
export class RecoveryReportPdfService {
  // ─── Shared drawing helpers ────────────────────────────────────────────────

  private newDoc() {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    return { doc, done };
  }

  private drawTitle(doc: PDFKit.PDFDocument, businessName: string, title: string, accent: string): number {
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left * 2;
    doc
      .fillColor(accent)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(businessName.toUpperCase(), left, 36, { width: contentWidth, align: 'center' });
    let y = doc.y + 8;
    doc.rect(left, y, contentWidth, 24).fill(accent);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(title, left, y + 6, { width: contentWidth, align: 'center' });
    return y + 36;
  }

  private drawSummaryBox(
    doc: PDFKit.PDFDocument,
    y: number,
    accent: string,
    tint: string,
    caption: string,
    headline: string,
  ): number {
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left * 2;
    doc.rect(left, y, contentWidth, 44).fill(tint);
    doc.rect(left, y, 4, 44).fill(accent);
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text(caption, left + 16, y + 8);
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(15).text(headline, left + 16, y + 19);
    doc
      .fillColor(MUTED).font('Helvetica').fontSize(9)
      .text(`Generated on ${dateStamp()}`, left, y + 16, { width: contentWidth - 16, align: 'right' });
    return y + 60;
  }

  /**
   * Striped table with variable-height rows: long text (party names,
   * reasons) wraps onto extra lines instead of being cut off with "…".
   * Handles page breaks (the header row repeats on every page).
   */
  private drawTable(
    doc: PDFKit.PDFDocument,
    startY: number,
    accent: string,
    tint: string,
    cols: TableCol[],
    rows: string[][],
    highlight?: { index: number },
  ): number {
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left * 2;
    let y = startY;

    const drawHeader = (rowY: number) => {
      doc.rect(left, rowY, contentWidth, HEADER_H).fill(accent);
      let x = left;
      cols.forEach((col) => {
        doc
          .font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
          .text(col.label, x + 4, rowY + 7, { width: col.width - 8, align: col.align });
        x += col.width;
      });
    };

    drawHeader(y);
    y += HEADER_H;

    rows.forEach((cells, idx) => {
      doc.fontSize(7.5);
      let rowH = MIN_ROW_H;
      cells.forEach((cell, i) => {
        doc.font(highlight?.index === i ? 'Helvetica-Bold' : 'Helvetica');
        const h = doc.heightOfString(cell, { width: cols[i].width - 8 });
        rowH = Math.max(rowH, h + 14);
      });

      if (y + rowH > doc.page.height - 50) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += HEADER_H;
      }
      if (idx % 2 === 1) doc.rect(left, y, contentWidth, rowH).fill(tint);

      let x = left;
      cells.forEach((cell, i) => {
        const col = cols[i];
        const isHighlight = highlight?.index === i;
        doc
          .font(isHighlight ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7.5)
          .fillColor(isHighlight ? accent : INK)
          .text(cell, x + 4, y + 7, { width: col.width - 8, align: col.align });
        x += col.width;
      });
      y += rowH;
    });

    return y;
  }

  private drawFooter(doc: PDFKit.PDFDocument, businessName: string) {
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left * 2;
    // lineBreak:false keeps it inside the bottom margin — wrapped text past
    // the margin would push a blank extra page
    doc
      .fillColor(MUTED)
      .fontSize(7)
      .text(
        `${businessName} | Computer-generated recovery report: based on AI call outcomes.`,
        left,
        doc.page.height - 52,
        { width: contentWidth, align: 'center', lineBreak: false },
      );
  }

  private drawEmptyNote(doc: PDFKit.PDFDocument, y: number, note: string) {
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left * 2;
    doc
      .fillColor(MUTED).font('Helvetica').fontSize(10)
      .text(note, left, y + 12, { width: contentWidth, align: 'center' });
  }

  // ─── Positive / Negative recovery report ───────────────────────────────────

  async generate(params: {
    type: 'positive' | 'negative';
    businessName: string;
    entries: ReportEntry[];
    // Per-rule counts (negative only): rendered as a line under the summary
    breakdown?: Array<{ category: string; count: number; amount: number }>;
  }): Promise<Buffer> {
    const theme = THEMES[params.type];
    const { doc, done } = this.newDoc();
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left * 2;

    let y = this.drawTitle(doc, params.businessName, theme.title, theme.accent);

    const totalDue = params.entries.reduce((s, e) => s + e.total_due, 0);
    y = this.drawSummaryBox(
      doc,
      y,
      theme.accent,
      theme.tint,
      params.type === 'positive' ? 'CUSTOMERS RESPONDING WELL' : 'CUSTOMERS NEEDING PERSONAL FOLLOW-UP',
      `${params.entries.length} customers  |  Rs.${inr(totalDue)} outstanding`,
    );

    // Why-breakdown: how many customers each negative rule caught
    if (params.breakdown && params.breakdown.length > 0) {
      const line = params.breakdown
        .map((b) => `${b.category}: ${b.count} (Rs.${inr(b.amount)})`)
        .join('   |   ');
      doc.font('Helvetica-Bold').fontSize(8).fillColor(INK);
      const h = doc.heightOfString(line, { width: contentWidth - 8 });
      doc.text(line, left + 4, y - 8, { width: contentWidth - 8 });
      y += h + 4;
    }

    // The negative report carries a per-party running count of refusals
    const isNegative = params.type === 'negative';
    const cols: TableCol[] = isNegative
      ? [
          { label: 'Party', width: 150, align: 'left' },
          { label: 'City', width: 70, align: 'left' },
          { label: 'Phone', width: 80, align: 'left' },
          { label: 'Agent', width: 90, align: 'left' },
          { label: 'Due (Rs.)', width: 70, align: 'right' },
          { label: 'Calls', width: 34, align: 'right' },
          { label: 'Refusals', width: 46, align: 'right' },
          { label: 'Status', width: 100, align: 'left' },
          { label: 'Why', width: 130, align: 'left' },
        ]
      : [
          { label: 'Party', width: 170, align: 'left' },
          { label: 'City', width: 75, align: 'left' },
          { label: 'Phone', width: 85, align: 'left' },
          { label: 'Agent', width: 95, align: 'left' },
          { label: 'Due (Rs.)', width: 70, align: 'right' },
          { label: 'Calls', width: 36, align: 'right' },
          { label: 'Status', width: 105, align: 'left' },
          { label: 'Why', width: 134, align: 'left' },
        ];
    const rows = params.entries.map((e) =>
      isNegative
        ? [
            e.customer_name,
            e.city ?? '-',
            e.phone ?? '-',
            e.agent ?? '-',
            inr(e.total_due),
            String(e.total_calls),
            String(e.refusal_count ?? 0),
            e.label,
            e.reason,
          ]
        : [
            e.customer_name,
            e.city ?? '-',
            e.phone ?? '-',
            e.agent ?? '-',
            inr(e.total_due),
            String(e.total_calls),
            e.label,
            e.reason,
          ],
    );

    const endY = this.drawTable(doc, y, theme.accent, theme.tint, cols, rows, { index: isNegative ? 7 : 6 });
    if (rows.length === 0) this.drawEmptyNote(doc, endY, 'No customers fall into this report yet.');

    this.drawFooter(doc, params.businessName);
    doc.end();
    return done;
  }

  // ─── Escalation parties report ─────────────────────────────────────────────

  async generateEscalation(params: {
    businessName: string;
    entries: EscalationEntry[];
  }): Promise<Buffer> {
    const accent = SEGMENT_COLORS.Escalation.accent;
    const tint = SEGMENT_COLORS.Escalation.tint;
    const { doc, done } = this.newDoc();

    let y = this.drawTitle(doc, params.businessName, 'ESCALATION PARTIES REPORT', accent);

    const totalDue = params.entries.reduce((s, e) => s + e.total_due, 0);
    y = this.drawSummaryBox(
      doc,
      y,
      accent,
      tint,
      'PARTIES IN THE ESCALATION RANGE: OLDEST UNPAID BILLS',
      `${params.entries.length} parties  |  Rs.${inr(totalDue)} outstanding`,
    );

    const cols: TableCol[] = [
      { label: 'Party', width: 170, align: 'left' },
      { label: 'City', width: 75, align: 'left' },
      { label: 'Phone', width: 85, align: 'left' },
      { label: 'Agent', width: 95, align: 'left' },
      { label: 'Due (Rs.)', width: 75, align: 'right' },
      { label: 'Oldest Bill', width: 60, align: 'right' },
      { label: 'Calls', width: 40, align: 'right' },
      { label: 'Last Outcome', width: 90, align: 'left' },
      { label: 'Last Call', width: 80, align: 'left' },
    ];
    const rows = params.entries.map((e) => [
      e.customer_name,
      e.city ?? '-',
      e.phone ?? '-',
      e.agent ?? '-',
      inr(e.total_due),
      `${e.days_overdue} days`,
      String(e.total_calls),
      e.last_label,
      shortDate(e.last_call_at),
    ]);

    const endY = this.drawTable(doc, y, accent, tint, cols, rows, { index: 7 });
    if (rows.length === 0) this.drawEmptyNote(doc, endY, 'No parties are in the Escalation range right now.');

    this.drawFooter(doc, params.businessName);
    doc.end();
    return done;
  }

  // ─── Segment overview report ───────────────────────────────────────────────

  async generateOverview(params: {
    businessName: string;
    data: {
      segments: SegmentOverviewSection[];
      total_outstanding: number;
      total_customers: number;
      cleared_count: number;
    };
  }): Promise<Buffer> {
    const accent = '#7F5539'; // brand mahogany for the neutral overview
    const tint = '#F5EBE0';
    const { doc, done } = this.newDoc();
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left * 2;

    let y = this.drawTitle(doc, params.businessName, 'SEGMENT OVERVIEW REPORT', accent);

    y = this.drawSummaryBox(
      doc,
      y,
      accent,
      tint,
      'ALL SEGMENTS AT A GLANCE',
      `${params.data.total_customers} active parties  |  Rs.${inr(params.data.total_outstanding)} outstanding  |  ${params.data.cleared_count} cleared`,
    );

    // Summary table: one row per segment
    const summaryCols: TableCol[] = [
      { label: 'Segment', width: 200, align: 'left' },
      { label: 'Day Range', width: 140, align: 'left' },
      { label: 'Parties', width: 100, align: 'right' },
      { label: 'Outstanding (Rs.)', width: 165, align: 'right' },
      { label: 'Share of Total', width: 165, align: 'right' },
    ];
    const summaryRows = params.data.segments.map((s) => [
      s.segment,
      s.range,
      String(s.count),
      inr(s.amount),
      `${s.share}%`,
    ]);
    y = this.drawTable(doc, y, accent, tint, summaryCols, summaryRows, { index: 0 });

    // Detail section per segment: full party list
    const detailCols: TableCol[] = [
      { label: 'Party', width: 220, align: 'left' },
      { label: 'City', width: 90, align: 'left' },
      { label: 'Phone', width: 95, align: 'left' },
      { label: 'Agent', width: 130, align: 'left' },
      { label: 'Due (Rs.)', width: 90, align: 'right' },
      { label: 'Oldest Bill', width: 145, align: 'right' },
    ];

    for (const seg of params.data.segments) {
      if (seg.count === 0) continue;
      const segTheme = SEGMENT_COLORS[seg.segment] ?? { accent, tint };

      // Section band: start it on a fresh page if it would not fit with at
      // least the table header + one row below it
      if (y + 30 + HEADER_H + MIN_ROW_H > doc.page.height - 50) {
        doc.addPage();
        y = doc.page.margins.top;
      } else {
        y += 14;
      }
      doc.rect(left, y, contentWidth, 22).fill(segTheme.accent);
      doc
        .fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
        .text(
          `${seg.segment.toUpperCase()}  (${seg.range})  :  ${seg.count} parties  |  Rs.${inr(seg.amount)}`,
          left + 8,
          y + 6,
          { width: contentWidth - 16 },
        );
      y += 26;

      const rows = seg.entries.map((e) => [
        e.customer_name,
        e.city ?? '-',
        e.phone ?? '-',
        e.agent ?? '-',
        inr(e.total_due),
        `${e.days_overdue} days`,
      ]);
      y = this.drawTable(doc, y, segTheme.accent, segTheme.tint, detailCols, rows);
    }

    if (params.data.segments.every((s) => s.count === 0)) {
      this.drawEmptyNote(doc, y, 'No active outstanding parties yet.');
    }

    this.drawFooter(doc, params.businessName);
    doc.end();
    return done;
  }
}
