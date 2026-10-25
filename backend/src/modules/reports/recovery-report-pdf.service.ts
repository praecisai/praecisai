import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { EscalationEntry, ReportEntry, SegmentOverviewSection } from './reports.service';

// Modern, quiet layout: white page, left-aligned header, KPI cards, hairline
// tables with a tinted status pill, page numbers on every page. Colour is used
// sparingly (one accent per report) so the numbers carry the page.
interface Theme {
  accent: string;
  tint: string;
}

const THEMES: Record<'positive' | 'negative', Theme & { eyebrow: string; subtitle: string }> = {
  positive: {
    accent: '#059669',
    tint: '#ECFDF5',
    eyebrow: 'POSITIVE RECOVERY REPORT',
    subtitle: 'Customers responding well to the AI follow-up',
  },
  negative: {
    accent: '#E11D48',
    tint: '#FFF1F2',
    eyebrow: 'NEGATIVE RECOVERY REPORT',
    subtitle: 'Customers who need a personal follow-up from your team',
  },
};

// Same segment hues as the dashboard, in a softer modern palette
const SEGMENT_COLORS: Record<string, Theme> = {
  'No Follow-up': { accent: '#64748B', tint: '#F1F5F9' },
  'Soft Reminder': { accent: '#059669', tint: '#ECFDF5' },
  'Follow-up': { accent: '#D97706', tint: '#FFFBEB' },
  'Strong Follow-up': { accent: '#EA580C', tint: '#FFF7ED' },
  Escalation: { accent: '#E11D48', tint: '#FFF1F2' },
};

// Brand mahogany for the neutral overview report
const BRAND: Theme = { accent: '#7F5539', tint: '#F7F1EB' };

const INK = '#111827';
const BODY = '#374151';
const MUTED = '#6B7280';
const HAIRLINE = '#E5E7EB';
const ROW_LINE = '#F0F1F3';
const CARD_BG = '#F9FAFB';

// Praecis AI brand colours (from the logo): navy wordmark + blue "AI"
const BRAND_NAVY = '#0F1D35';
const BRAND_BLUE = '#3B63F3';

const HEADER_H = 24;
const MIN_ROW_H = 24;
const FOOTER_RESERVE = 60; // keep table rows clear of the footer line

interface TableCol {
  label: string;
  width: number;
  align: 'left' | 'right';
}

interface Kpi {
  label: string;
  value: string;
  accent?: boolean;
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
    // bufferPages lets the footer write "Page X of Y" once everything is laid out
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    return { doc, done };
  }

  private contentWidth(doc: PDFKit.PDFDocument) {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

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

  /** "✦ Praecis AI" wordmark, right-aligned at the given baseline area. */
  private drawPraecisLogo(doc: PDFKit.PDFDocument, yText: number, fontSize = 10) {
    doc.font('Helvetica-Bold').fontSize(fontSize);
    const praecisW = doc.widthOfString('Praecis');
    const spaceW = doc.widthOfString(' ');
    const aiW = doc.widthOfString('AI');
    const starR = fontSize * 0.55;
    const gap = 4;
    const right = doc.page.width - doc.page.margins.right;
    const x = right - (starR * 2 + gap + praecisW + spaceW + aiW);
    this.drawSparkle(doc, x + starR, yText + fontSize * 0.38, starR, BRAND_NAVY);
    const xText = x + starR * 2 + gap;
    doc.fillColor(BRAND_NAVY).text('Praecis', xText, yText, { lineBreak: false });
    doc.fillColor(BRAND_BLUE).text('AI', xText + praecisW + spaceW, yText, { lineBreak: false });
  }

  /**
   * Header: short accent rule, eyebrow, business name, one-line subtitle on
   * the left; logo and generation date on the right; hairline underneath.
   */
  private drawTitle(
    doc: PDFKit.PDFDocument,
    businessName: string,
    eyebrow: string,
    subtitle: string,
    accent: string,
  ): number {
    const left = doc.page.margins.left;
    const width = this.contentWidth(doc);
    const textW = width - 200; // leave room for the logo block on the right

    doc.roundedRect(left, 36, 26, 3, 1.5).fill(accent);
    doc
      .fillColor(accent).font('Helvetica-Bold').fontSize(8)
      .text(eyebrow, left, 46, { width: textW, characterSpacing: 1.2, lineBreak: false });
    doc
      .fillColor(INK).font('Helvetica-Bold').fontSize(22)
      .text(businessName, left, 60, { width: textW, lineBreak: false, ellipsis: true });
    doc
      .fillColor(MUTED).font('Helvetica').fontSize(9.5)
      .text(subtitle, left, 88, { width: textW, lineBreak: false });

    this.drawPraecisLogo(doc, 44, 11);
    doc
      .fillColor(MUTED).font('Helvetica').fontSize(8)
      .text(`Generated on ${dateStamp()}`, left, 62, { width, align: 'right', lineBreak: false });

    const y = 112;
    doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.75).strokeColor(HAIRLINE).stroke();
    return y + 16;
  }

  /** Row of equal-width rounded KPI cards. */
  private drawKpis(doc: PDFKit.PDFDocument, y: number, accent: string, kpis: Kpi[]): number {
    const left = doc.page.margins.left;
    const width = this.contentWidth(doc);
    const gap = 12;
    const h = 58;
    const cardW = (width - gap * (kpis.length - 1)) / kpis.length;

    kpis.forEach((k, i) => {
      const x = left + i * (cardW + gap);
      doc.roundedRect(x, y, cardW, h, 8).lineWidth(0.75).fillAndStroke(CARD_BG, HAIRLINE);
      if (k.accent) doc.roundedRect(x + 14, y + 12, 6, 6, 3).fill(accent);
      doc
        .fillColor(MUTED).font('Helvetica-Bold').fontSize(7)
        .text(k.label.toUpperCase(), x + (k.accent ? 26 : 14), y + 12, {
          width: cardW - 40,
          characterSpacing: 0.8,
          lineBreak: false,
        });
      doc
        .fillColor(k.accent ? accent : INK).font('Helvetica-Bold').fontSize(17)
        .text(k.value, x + 14, y + 27, { width: cardW - 28, lineBreak: false, ellipsis: true });
    });
    return y + h + 18;
  }

  /** Small section caption above a table or chart. */
  private drawCaption(doc: PDFKit.PDFDocument, y: number, text: string): number {
    doc
      .fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5)
      .text(text.toUpperCase(), doc.page.margins.left, y, { characterSpacing: 0.9, lineBreak: false });
    return y + 16;
  }

  /** Wrapping row of tinted chips, e.g. the negative report's why-breakdown. */
  private drawChips(doc: PDFKit.PDFDocument, y: number, theme: Theme, labels: string[]): number {
    const left = doc.page.margins.left;
    const right = left + this.contentWidth(doc);
    const h = 18;
    let x = left;
    doc.font('Helvetica-Bold').fontSize(7.5);
    labels.forEach((label) => {
      const w = doc.widthOfString(label) + 16;
      if (x + w > right && x > left) {
        x = left;
        y += h + 6;
      }
      doc.roundedRect(x, y, w, h, 9).fill(theme.tint);
      doc.fillColor(theme.accent).text(label, x + 8, y + 5.5, { lineBreak: false });
      x += w + 6;
    });
    return y + h + 16;
  }

  /**
   * Hairline table with variable-height rows: long text (party names,
   * reasons) wraps onto extra lines instead of being cut off with "…".
   * The first column is set in bold; the `pill` column is drawn as a tinted
   * status pill. Handles page breaks (the header row repeats on every page).
   */
  private drawTable(
    doc: PDFKit.PDFDocument,
    startY: number,
    theme: Theme,
    cols: TableCol[],
    rows: string[][],
    opts: { pill?: number; rowTheme?: (rowIdx: number) => Theme } = {},
  ): number {
    const left = doc.page.margins.left;
    const width = this.contentWidth(doc);
    const PAD = 6;
    let y = startY;

    const drawHeader = (rowY: number) => {
      let x = left;
      cols.forEach((col) => {
        // Narrow columns ("Calls", "Refusals"): shrink the label so it stays on one line
        const label = col.label.toUpperCase();
        const avail = col.width - PAD * 2;
        let size = 7;
        let spacing = 0.6;
        doc.font('Helvetica-Bold').fontSize(size);
        while (size > 5 && doc.widthOfString(label, { characterSpacing: spacing }) > avail) {
          size -= 0.5;
          spacing = 0.2;
          doc.fontSize(size);
        }
        doc
          .fillColor(MUTED)
          .text(label, x + PAD, rowY + 8, {
            width: avail + 2,
            align: col.align,
            characterSpacing: spacing,
            lineBreak: false,
          });
        x += col.width;
      });
      doc
        .moveTo(left, rowY + HEADER_H).lineTo(left + width, rowY + HEADER_H)
        .lineWidth(0.9).strokeColor(HAIRLINE).stroke();
    };

    const fontFor = (i: number) => (i === 0 || i === opts.pill ? 'Helvetica-Bold' : 'Helvetica');

    drawHeader(y);
    y += HEADER_H;

    rows.forEach((cells, idx) => {
      doc.fontSize(8);
      let rowH = MIN_ROW_H;
      cells.forEach((cell, i) => {
        doc.font(fontFor(i));
        const extra = i === opts.pill ? 8 : 0; // pill padding
        const h = doc.heightOfString(cell, { width: cols[i].width - PAD * 2 - extra });
        rowH = Math.max(rowH, h + 16);
      });

      if (y + rowH > doc.page.height - FOOTER_RESERVE) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += HEADER_H;
      }

      const rowTheme = opts.rowTheme ? opts.rowTheme(idx) : theme;
      let x = left;
      cells.forEach((cell, i) => {
        const col = cols[i];
        if (i === opts.pill && cell && cell !== '-') {
          doc.font('Helvetica-Bold').fontSize(7.5);
          const maxW = col.width - PAD * 2;
          const singleW = doc.widthOfString(cell) + 14;
          if (singleW <= maxW) {
            const px = col.align === 'right' ? x + col.width - PAD - singleW : x + PAD;
            doc.roundedRect(px, y + 5, singleW, 15, 7.5).fill(rowTheme.tint);
            doc.fillColor(rowTheme.accent).text(cell, px + 7, y + 9, { lineBreak: false });
          } else {
            // Too long for a pill: wrap it as accent-coloured text instead
            doc.fillColor(rowTheme.accent).text(cell, x + PAD, y + 8, { width: maxW, align: col.align });
          }
        } else {
          doc
            .font(fontFor(i)).fontSize(8)
            .fillColor(i === 0 ? INK : BODY)
            .text(cell, x + PAD, y + 8, { width: col.width - PAD * 2, align: col.align });
        }
        x += col.width;
      });
      y += rowH;
      doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).strokeColor(ROW_LINE).stroke();
    });

    return y;
  }

  /** Hairline + business name on the left, "Page X of Y" on the right, every page. */
  private drawFooters(doc: PDFKit.PDFDocument, businessName: string, reportName: string) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const left = doc.page.margins.left;
      const width = this.contentWidth(doc);
      const y = doc.page.height - 44;
      // Writing below the bottom margin would otherwise push a blank page
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).strokeColor(HAIRLINE).stroke();
      doc
        .fillColor(MUTED).font('Helvetica').fontSize(7)
        .text(
          `${businessName}  ·  ${reportName}  ·  Computer-generated from AI call outcomes`,
          left,
          y + 8,
          { width: width - 80, lineBreak: false },
        );
      doc
        .fillColor(MUTED).font('Helvetica-Bold').fontSize(7)
        .text(`Page ${i - range.start + 1} of ${range.count}`, left, y + 8, {
          width,
          align: 'right',
          lineBreak: false,
        });
      doc.page.margins.bottom = bottom;
    }
  }

  private drawEmptyNote(doc: PDFKit.PDFDocument, y: number, note: string) {
    const left = doc.page.margins.left;
    const width = this.contentWidth(doc);
    doc.roundedRect(left, y + 14, width, 44, 8).fill(CARD_BG);
    doc
      .fillColor(MUTED).font('Helvetica').fontSize(10)
      .text(note, left, y + 30, { width, align: 'center' });
  }

  // ─── Positive / Negative recovery report ───────────────────────────────────

  async generate(params: {
    type: 'positive' | 'negative';
    businessName: string;
    entries: ReportEntry[];
    // Per-rule counts (negative only): rendered as chips under the KPI cards
    breakdown?: Array<{ category: string; count: number; amount: number }>;
  }): Promise<Buffer> {
    const theme = THEMES[params.type];
    const { doc, done } = this.newDoc();

    let y = this.drawTitle(doc, params.businessName, theme.eyebrow, theme.subtitle, theme.accent);

    const count = params.entries.length;
    const totalDue = params.entries.reduce((s, e) => s + e.total_due, 0);
    const totalCalls = params.entries.reduce((s, e) => s + e.total_calls, 0);
    y = this.drawKpis(doc, y, theme.accent, [
      { label: 'Customers', value: String(count), accent: true },
      { label: 'Outstanding', value: `Rs. ${inr(totalDue)}` },
      { label: 'Average per customer', value: count ? `Rs. ${inr(totalDue / count)}` : '-' },
      { label: 'AI calls made', value: inr(totalCalls) },
    ]);

    // Why-breakdown: how many customers each negative rule caught
    if (params.breakdown && params.breakdown.length > 0) {
      y = this.drawCaption(doc, y, 'Why they are on this list');
      y = this.drawChips(
        doc,
        y,
        theme,
        params.breakdown.map((b) => `${b.category}  ·  ${b.count}  ·  Rs. ${inr(b.amount)}`),
      );
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

    y = this.drawCaption(doc, y, 'Customer details');
    const endY = this.drawTable(doc, y, theme, cols, rows, { pill: isNegative ? 7 : 6 });
    if (rows.length === 0) this.drawEmptyNote(doc, endY, 'No customers fall into this report yet.');

    this.drawFooters(doc, params.businessName, isNegative ? 'Negative recovery report' : 'Positive recovery report');
    doc.end();
    return done;
  }

  // ─── Escalation parties report ─────────────────────────────────────────────

  async generateEscalation(params: {
    businessName: string;
    entries: EscalationEntry[];
  }): Promise<Buffer> {
    const theme = SEGMENT_COLORS.Escalation;
    const { doc, done } = this.newDoc();

    let y = this.drawTitle(
      doc,
      params.businessName,
      'ESCALATION PARTIES REPORT',
      'Parties in the escalation range, with their oldest unpaid bills',
      theme.accent,
    );

    const totalDue = params.entries.reduce((s, e) => s + e.total_due, 0);
    const totalCalls = params.entries.reduce((s, e) => s + e.total_calls, 0);
    const oldest = params.entries.reduce((m, e) => Math.max(m, e.days_overdue), 0);
    y = this.drawKpis(doc, y, theme.accent, [
      { label: 'Parties', value: String(params.entries.length), accent: true },
      { label: 'Outstanding', value: `Rs. ${inr(totalDue)}` },
      { label: 'Oldest unpaid bill', value: params.entries.length ? `${oldest} days` : '-' },
      { label: 'AI calls made', value: inr(totalCalls) },
    ]);

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

    y = this.drawCaption(doc, y, 'Party details');
    const endY = this.drawTable(doc, y, theme, cols, rows, { pill: 7 });
    if (rows.length === 0) this.drawEmptyNote(doc, endY, 'No parties are in the Escalation range right now.');

    this.drawFooters(doc, params.businessName, 'Escalation parties report');
    doc.end();
    return done;
  }

  // ─── Segment overview report ───────────────────────────────────────────────

  /** One rounded horizontal bar split by each segment's share of the outstanding. */
  private drawShareBar(doc: PDFKit.PDFDocument, y: number, segments: SegmentOverviewSection[]): number {
    const left = doc.page.margins.left;
    const width = this.contentWidth(doc);
    const total = segments.reduce((s, x) => s + x.amount, 0);
    if (total <= 0) return y;

    const h = 12;
    doc.save();
    doc.roundedRect(left, y, width, h, h / 2).clip();
    doc.rect(left, y, width, h).fill(ROW_LINE);
    let x = left;
    segments.forEach((seg) => {
      if (seg.amount <= 0) return;
      const w = (seg.amount / total) * width;
      doc.rect(x, y, w, h).fill((SEGMENT_COLORS[seg.segment] ?? BRAND).accent);
      x += w;
    });
    doc.restore();

    // Legend: dot + name + share, wrapping if needed
    let lx = left;
    let ly = y + h + 10;
    const right = left + width;
    segments.forEach((seg) => {
      const color = (SEGMENT_COLORS[seg.segment] ?? BRAND).accent;
      doc.font('Helvetica-Bold').fontSize(7.5);
      const name = seg.segment;
      const share = `${seg.share}%`;
      const itemW = 10 + doc.widthOfString(name) + 4 + doc.font('Helvetica').widthOfString(share) + 18;
      if (lx + itemW > right && lx > left) {
        lx = left;
        ly += 14;
      }
      doc.circle(lx + 3, ly + 3.5, 3).fill(color);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(7.5).text(name, lx + 10, ly, { lineBreak: false });
      const nameW = doc.widthOfString(name);
      doc.fillColor(MUTED).font('Helvetica').text(share, lx + 10 + nameW + 4, ly, { lineBreak: false });
      lx += itemW;
    });
    return ly + 26;
  }

  async generateOverview(params: {
    businessName: string;
    data: {
      segments: SegmentOverviewSection[];
      total_outstanding: number;
      total_customers: number;
      cleared_count: number;
    };
  }): Promise<Buffer> {
    const theme = BRAND;
    const { doc, done } = this.newDoc();
    const left = doc.page.margins.left;
    const width = this.contentWidth(doc);

    let y = this.drawTitle(
      doc,
      params.businessName,
      'SEGMENT OVERVIEW REPORT',
      'Every segment of your outstanding at a glance',
      theme.accent,
    );

    const largest = [...params.data.segments].sort((a, b) => b.amount - a.amount)[0];
    y = this.drawKpis(doc, y, theme.accent, [
      { label: 'Active parties', value: String(params.data.total_customers), accent: true },
      { label: 'Outstanding', value: `Rs. ${inr(params.data.total_outstanding)}` },
      { label: 'Cleared', value: String(params.data.cleared_count) },
      { label: 'Largest segment', value: largest && largest.amount > 0 ? largest.segment : '-' },
    ]);

    y = this.drawCaption(doc, y, 'Outstanding by segment');
    y = this.drawShareBar(doc, y, params.data.segments);

    // Summary table: one row per segment, segment name as a coloured pill
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
    y = this.drawTable(doc, y, theme, summaryCols, summaryRows, {
      pill: 0,
      rowTheme: (i) => SEGMENT_COLORS[params.data.segments[i].segment] ?? theme,
    });

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
      const segTheme = SEGMENT_COLORS[seg.segment] ?? theme;

      // Section heading: start it on a fresh page if it would not fit with at
      // least the table header + one row below it
      if (y + 40 + HEADER_H + MIN_ROW_H > doc.page.height - FOOTER_RESERVE) {
        doc.addPage();
        y = doc.page.margins.top;
      } else {
        y += 22;
      }
      doc.roundedRect(left, y, 4, 18, 2).fill(segTheme.accent);
      doc
        .fillColor(INK).font('Helvetica-Bold').fontSize(12)
        .text(seg.segment, left + 12, y + 3, { lineBreak: false });
      const nameW = doc.widthOfString(seg.segment);
      doc
        .fillColor(MUTED).font('Helvetica').fontSize(8.5)
        .text(
          `${seg.range}   ·   ${seg.count} parties   ·   Rs. ${inr(seg.amount)}`,
          left + 12 + nameW + 12,
          y + 6,
          { width: width - nameW - 24, lineBreak: false },
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
      y = this.drawTable(doc, y, segTheme, detailCols, rows);
    }

    if (params.data.segments.every((s) => s.count === 0)) {
      this.drawEmptyNote(doc, y, 'No active outstanding parties yet.');
    }

    this.drawFooters(doc, params.businessName, 'Segment overview report');
    doc.end();
    return done;
  }
}
