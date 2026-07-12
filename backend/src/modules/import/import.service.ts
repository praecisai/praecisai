import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OutstandingService } from '../outstanding/outstanding.service';
import {
  normalizePhone,
  parseIndianDate,
  getSegment,
  getAgingBucket,
  DEFAULT_SEGMENT_RULES,
} from '../../common/utils/segment.util';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';

// ─── Target field definitions ─────────────────────────────────────────────────

export type TargetField =
  | 'customer_name'
  | 'city'
  | 'invoice_number'
  | 'invoice_date'
  | 'sales_agent'
  | 'bill_amount'
  | 'due_amount'
  | 'days_overdue'
  | 'phone'
  | 'call_status';

export interface ColumnMapping {
  target_field: TargetField;
  source_column: string;
  confidence?: number;
}

// Fuzzy matching hints — alternate names businesses commonly use
const FIELD_ALIASES: Record<TargetField, string[]> = {
  customer_name: ['Party Name', 'Customer Name', 'Client', 'Name', 'Party', 'Customer'],
  city: ['City', 'Location', 'Place', 'Town', 'District'],
  invoice_number: ['Bill No.', 'Invoice No.', 'Invoice Number', 'Bill Number', 'Inv No', 'Bill No'],
  invoice_date: ['Bill Date', 'Invoice Date', 'Date', 'Inv Date', 'Bill Dt'],
  sales_agent: ['Agent Name', 'Salesman', 'Rep Name', 'Sales Rep', 'Agent', 'Executive'],
  bill_amount: ['Bill Amount', 'Bill Amt', 'Invoice Amount', 'Bill Amt (Rs.)', 'Gross Amount', 'Invoice Amt'],
  due_amount: ['Due Amount (₹)', 'Outstanding Amount', 'Balance Due', 'Amount Due', 'Due Amt', 'Outstanding', 'Due Amount', 'Balance'],
  days_overdue: ['Days Outstanding', 'Overdue Days', 'Aging Days', 'Days Overdue', 'Outstanding Days', 'Aging', 'Due', 'Due Days'],
  phone: ['Mobile No.', 'Phone', 'Contact', 'Mobile', 'Phone No', 'Mobile Number', 'Contact No'],
  call_status: ['Call Status', 'Status', 'Call State'],
};

// ─── Import Service ───────────────────────────────────────────────────────────

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private outstandingService: OutstandingService,
  ) {}

  // ─── STEP 1: Upload file ────────────────────────────────────────────────────

  async upload(businessId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ];

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      throw new BadRequestException('Only .xlsx, .xls, and .csv files are supported');
    }

    // Parse headers + row count
    const { headers, rowCount } = this.extractHeadersAndCount(file.buffer, ext!);

    // Upload to Supabase Storage
    const fileUrl = await this.storage.uploadImportFile(
      businessId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    // Create ImportHistory record
    const history = await this.prisma.importHistory.create({
      data: {
        business_id: businessId,
        file_name: file.originalname,
        file_url: fileUrl,
        status: 'PENDING',
        records_total: rowCount,
      },
    });

    // Auto-detect column mappings via fuzzy match
    const suggestedMappings = this.autoDetectMappings(headers);

    return {
      history_id: history.id,
      file_url: fileUrl,
      file_name: file.originalname,
      headers,
      row_count: rowCount,
      suggested_mappings: suggestedMappings,
    };
  }

  // ─── STEP 2: Preview mapped data ───────────────────────────────────────────

  async preview(
    businessId: string,
    historyId: string,
    mappings: ColumnMapping[],
  ) {
    const history = await this.getHistory(businessId, historyId);
    const fileBuffer = await this.storage.downloadFile(history.file_url);
    const ext = history.file_name.split('.').pop()?.toLowerCase() ?? 'xlsx';

    const rows = this.parseFile(fileBuffer, ext);

    // Preview real data rows — skip subtotal rows, apply the same
    // party/city split the import will do
    const previewed: Array<{ row_index: number; mapped: any; raw: any; errors: any[] }> = [];
    for (let i = 0; i < rows.length && previewed.length < 5; i++) {
      const mapped = this.applyMapping(rows[i], mappings);
      if (mapped.customer_name && this.isTotalsRow(String(mapped.customer_name))) continue;
      if (mapped.customer_name && !String(mapped.city ?? '').trim()) {
        const split = this.splitPartyCity(String(mapped.customer_name));
        mapped.customer_name = split.name;
        if (split.city) mapped.city = split.city;
      }
      const errors = this.validateRow(mapped, i + 1);
      previewed.push({ row_index: i + 1, mapped, raw: rows[i], errors });
    }

    const totalErrors = previewed.flatMap((p) => p.errors);

    return {
      preview: previewed,
      validation_errors: totalErrors,
      total_rows: rows.length,
    };
  }

  // ─── STEP 3: Execute full import ────────────────────────────────────────────
  // Bulk pipeline: everything is transformed in memory first, then written in
  // a handful of set-based queries. The previous per-row version issued 3-4
  // DB roundtrips per row (~1 hour for a 3,000-row Tally export over a remote
  // Supabase connection).

  async execute(
    businessId: string,
    historyId: string,
    mappings: ColumnMapping[],
    templateName?: string,
  ) {
    const history = await this.getHistory(businessId, historyId);

    // Mark as processing
    await this.prisma.importHistory.update({
      where: { id: historyId },
      data: { status: 'PROCESSING' },
    });

    const fileBuffer = await this.storage.downloadFile(history.file_url);
    const ext = history.file_name.split('.').pop()?.toLowerCase() ?? 'xlsx';
    const rows = this.parseFile(fileBuffer, ext);

    let failed = 0;
    let skipped = 0;
    const errors: any[] = [];

    // ── Phase 1: transform + validate every row in memory ────────────────────
    interface ParsedRow {
      name: string;
      phone: string | null;
      city: string | null;
      invoiceNumber: string;
      invoiceDate: Date;
      billAmount: number | null;
      dueAmount: number;
      daysOverdue: number;
      agent: string | null;
    }
    const parsedRows: ParsedRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const mapped = this.applyMapping(rows[i], mappings);

      // Skip subtotal/grand-total rows silently — they are not data
      if (mapped.customer_name && this.isTotalsRow(String(mapped.customer_name))) {
        skipped++;
        continue;
      }

      // Split "PARTY -CITY" suffix when the file has no city column
      if (mapped.customer_name && !String(mapped.city ?? '').trim()) {
        const split = this.splitPartyCity(String(mapped.customer_name));
        mapped.customer_name = split.name;
        if (split.city) mapped.city = split.city;
      }

      const rowErrors = this.validateRow(mapped, rowNum);
      if (rowErrors.some((e) => e.field === 'customer_name' || e.field === 'invoice_number')) {
        failed++;
        errors.push(...rowErrors);
        continue;
      }

      const dueAmount = parseFloat(String(mapped.due_amount ?? '0').replace(/[^0-9.\-]/g, '')) || 0;
      const billAmountRaw = parseFloat(String(mapped.bill_amount ?? '').replace(/[^0-9.\-]/g, ''));

      parsedRows.push({
        name: String(mapped.customer_name ?? '').trim(),
        phone: mapped.phone ? normalizePhone(mapped.phone) : null,
        city: mapped.city ? String(mapped.city).trim() : null,
        invoiceNumber: String(mapped.invoice_number ?? '').trim(),
        invoiceDate:
          (mapped.invoice_date ? parseIndianDate(String(mapped.invoice_date)) : null) ?? new Date(),
        billAmount: isNaN(billAmountRaw) ? null : billAmountRaw,
        dueAmount,
        daysOverdue: parseInt(String(mapped.days_overdue ?? '0')) || 0,
        agent: mapped.sales_agent ? String(mapped.sales_agent).trim() : null,
      });
    }

    const imported = parsedRows.length;

    // ── Phase 2: resolve customers (2 queries + 1 bulk insert) ────────────────
    const existingCustomers = await this.prisma.customer.findMany({
      where: { business_id: businessId },
      select: { id: true, customer_name: true, phone: true, city: true },
    });

    const byPhone = new Map<string, { id: string; city: string | null }>();
    const byName = new Map<string, { id: string; city: string | null }>();
    for (const c of existingCustomers) {
      if (c.phone) byPhone.set(c.phone, c);
      byName.set(c.customer_name.trim().toLowerCase(), c);
    }

    // NAME-first identity: in accounting exports the party name is the real
    // identity — phones can repeat across parties (one proprietor, several
    // shops; or the owner testing with their own number). Matching phone-first
    // would silently merge distinct parties into one customer.
    const resolveExisting = (r: ParsedRow) =>
      byName.get(r.name.toLowerCase()) || (r.phone && byPhone.get(r.phone)) || null;

    // Distinct new customers (first occurrence wins), keyed by name
    const newByKey = new Map<string, ParsedRow>();
    const matchedIds = new Set<string>();
    for (const r of parsedRows) {
      const existing = resolveExisting(r);
      if (existing) {
        matchedIds.add(existing.id);
      } else {
        const key = r.name.toLowerCase();
        if (!newByKey.has(key)) newByKey.set(key, r);
      }
    }

    const createData = Array.from(newByKey.values()).map((r) => ({
      business_id: businessId,
      customer_name: r.name,
      phone: r.phone,
      city: r.city,
    }));

    const createdCustomers = createData.length
      ? await this.prisma.customer.createManyAndReturn({
          data: createData,
          skipDuplicates: true,
        })
      : [];

    for (const c of createdCustomers) {
      if (c.phone) byPhone.set(c.phone, c);
      byName.set(c.customer_name.trim().toLowerCase(), c);
    }

    const customersCreated = createdCustomers.length;
    const customersUpdated = matchedIds.size;

    // ── Phase 3: snapshot-sync invoices ───────────────────────────────────────
    // Every upload is treated as the CURRENT outstanding report:
    //   • bills new in the file            → created
    //   • bills whose due/days changed     → updated (partial payments flow in)
    //   • bills missing from the file      → marked PAID with due 0 (Tally
    //     outstanding reports only list unpaid bills, so absent = cleared;
    //     this is also what lets PDC cheque-clearing detection fire)
    const existingInvoices = await this.prisma.invoice.findMany({
      where: { business_id: businessId },
      select: { id: true, invoice_number: true, due_amount: true, days_overdue: true, status: true, customer_id: true },
    });
    const existingByNumber = new Map(existingInvoices.map((i) => [i.invoice_number, i]));

    // Deduplicate within the file — first row of an invoice number wins
    const invoiceByNumber = new Map<string, ParsedRow>();
    for (const r of parsedRows) {
      if (!invoiceByNumber.has(r.invoiceNumber)) invoiceByNumber.set(r.invoiceNumber, r);
    }

    const affectedCustomerIds = new Set<string>();
    const invoiceData: any[] = [];
    const invoiceUpdates: Array<{ id: string; due_amount: number; days_overdue: number; status: string }> = [];

    for (const r of invoiceByNumber.values()) {
      const customer = resolveExisting(r);
      if (!customer) continue; // cannot happen — created above
      affectedCustomerIds.add(customer.id);

      const status = r.dueAmount <= 0 ? 'PAID' : r.daysOverdue > 0 ? 'OVERDUE' : 'PENDING';
      const existing = existingByNumber.get(r.invoiceNumber);

      if (existing) {
        if (
          existing.due_amount !== r.dueAmount ||
          existing.days_overdue !== r.daysOverdue ||
          existing.status !== status
        ) {
          invoiceUpdates.push({ id: existing.id, due_amount: r.dueAmount, days_overdue: r.daysOverdue, status });
        }
        continue;
      }

      invoiceData.push({
        business_id: businessId,
        customer_id: customer.id,
        invoice_number: r.invoiceNumber,
        invoice_date: r.invoiceDate,
        amount: r.billAmount ?? Math.abs(r.dueAmount),
        due_amount: r.dueAmount,
        days_overdue: r.daysOverdue,
        sales_agent: r.agent,
        status,
      });
    }

    let invoicesCreated = 0;
    for (let i = 0; i < invoiceData.length; i += 500) {
      const res = await this.prisma.invoice.createMany({
        data: invoiceData.slice(i, i + 500),
        skipDuplicates: true,
      });
      invoicesCreated += res.count;
    }

    // Update bills whose due/days changed since the last upload
    for (let i = 0; i < invoiceUpdates.length; i += 25) {
      await Promise.all(
        invoiceUpdates.slice(i, i + 25).map((u) =>
          this.prisma.invoice.update({
            where: { id: u.id },
            data: { due_amount: u.due_amount, days_overdue: u.days_overdue, status: u.status as any },
          }),
        ),
      );
    }
    const invoicesUpdated = invoiceUpdates.length;

    // Bills that disappeared from the report were paid — clear them
    const cleared = existingInvoices.filter(
      (i) => !invoiceByNumber.has(i.invoice_number) && i.due_amount !== 0,
    );
    if (cleared.length > 0) {
      await this.prisma.invoice.updateMany({
        where: { id: { in: cleared.map((c) => c.id) } },
        data: { due_amount: 0, status: 'PAID' },
      });
      cleared.forEach((c) => affectedCustomerIds.add(c.customer_id));
    }
    const invoicesCleared = cleared.length;

    // ── Phase 4: bulk outstanding recalc ──────────────────────────────────────
    const outstandingUpdated = await this.outstandingService.bulkRecalculate(
      businessId,
      Array.from(affectedCustomerIds),
    );

    // Save template if requested
    if (templateName) {
      await this.saveTemplate(businessId, templateName, mappings);
    }

    // Update history
    await this.prisma.importHistory.update({
      where: { id: historyId },
      data: {
        status: imported === 0 && failed > 0 ? 'FAILED' : 'COMPLETED',
        records_total: rows.length,
        records_imported: imported,
        records_failed: failed,
        error_log: errors as any,
      },
    });

    return {
      history_id: historyId,
      records_total: rows.length,
      records_imported: imported,
      records_failed: failed,
      records_skipped: skipped,
      customers_created: customersCreated,
      customers_updated: customersUpdated,
      invoices_created: invoicesCreated,
      invoices_updated: invoicesUpdated,
      invoices_cleared: invoicesCleared,
      outstanding_updated: outstandingUpdated,
      errors: errors.slice(0, 50), // cap error list
    };
  }

  // ─── Templates ──────────────────────────────────────────────────────────────

  async getTemplates(businessId: string) {
    return this.prisma.importTemplate.findMany({
      where: { business_id: businessId },
      orderBy: { created_at: 'desc' },
    });
  }

  async saveTemplate(
    businessId: string,
    name: string,
    mappings: ColumnMapping[],
  ) {
    return this.prisma.importTemplate.upsert({
      where: { name_business_id: { name, business_id: businessId } },
      create: { business_id: businessId, name, mappings: mappings as any },
      update: { mappings: mappings as any },
    });
  }

  // ─── History ─────────────────────────────────────────────────────────────────

  async getHistoryList(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.importHistory.findMany({
        where: { business_id: businessId },
        skip, take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.importHistory.count({ where: { business_id: businessId } }),
    ]);
    return { data, total, page, limit };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async getHistory(businessId: string, historyId: string) {
    const history = await this.prisma.importHistory.findFirst({
      where: { id: historyId, business_id: businessId },
    });
    if (!history) throw new NotFoundException('Import history not found');
    return history;
  }

  /**
   * Find the real header row. Tally/accounting exports often put a report
   * title (and blank rows) above the column headers, so "row 1 = headers"
   * breaks. Scores the first 15 rows by how many cells match a known field
   * alias and picks the best row (needs at least 2 matches); falls back to
   * the first non-empty row.
   */
  private findHeaderRowIndex(rows: any[][]): number {
    const allAliases = Object.values(FIELD_ALIASES)
      .flat()
      .map((a) => a.toLowerCase());

    let bestIdx = -1;
    let bestScore = 0;

    const limit = Math.min(rows.length, 15);
    for (let i = 0; i < limit; i++) {
      const cells = (rows[i] ?? []).map((c) => String(c ?? '').trim().toLowerCase());
      const score = cells.filter((c) => c && allAliases.includes(c)).length;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestScore >= 2) return bestIdx;

    // Fallback: first row that has any content
    return rows.findIndex((r) => (r ?? []).some((c) => String(c ?? '').trim() !== ''));
  }

  private extractHeadersAndCount(
    buffer: Buffer,
    ext: string,
  ): { headers: string[]; rowCount: number } {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      header: 1,
      defval: '',
    }) as any[][];

    if (json.length === 0) return { headers: [], rowCount: 0 };

    const headerIdx = this.findHeaderRowIndex(json);
    if (headerIdx < 0) return { headers: [], rowCount: 0 };

    const headers = (json[headerIdx] as string[])
      .map((h) => String(h ?? '').trim())
      .filter(Boolean);
    const rowCount = Math.max(0, json.length - headerIdx - 1);

    return { headers, rowCount };
  }

  private parseFile(buffer: Buffer, ext: string): Record<string, string>[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const grid = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'DD/MM/YYYY',
    }) as any[][];

    if (grid.length === 0) return [];

    const headerIdx = this.findHeaderRowIndex(grid);
    if (headerIdx < 0) return [];

    const headers = (grid[headerIdx] as any[]).map((h) => String(h ?? '').trim());

    const records: Record<string, string>[] = [];
    for (let i = headerIdx + 1; i < grid.length; i++) {
      const row = grid[i] ?? [];
      if (!row.some((c) => String(c ?? '').trim() !== '')) continue; // blank row

      const normalized: Record<string, string> = {};
      headers.forEach((h, col) => {
        if (h) normalized[h] = String(row[col] ?? '').trim();
      });
      records.push(normalized);
    }
    return records;
  }

  /**
   * Tally exports often embed the city in the party name as a suffix:
   * "59 COLOURS                    -LUDHIANA". Split at the LAST " -"
   * so names containing brackets/dashes stay intact.
   */
  private splitPartyCity(name: string): { name: string; city: string | null } {
    const match = name.match(/^(.*\S)\s+-\s*([A-Za-z0-9 .()&'\/]+)$/);
    if (match) {
      return { name: match[1].trim(), city: match[2].trim() };
    }
    return { name: name.trim(), city: null };
  }

  /** Subtotal/grand-total rows from accounting exports — not real parties. */
  private isTotalsRow(customerName: string): boolean {
    return /^(PARTY|GRAND|SUB)?\s*TOTALS?$/i.test(customerName.trim());
  }

  private autoDetectMappings(headers: string[]): Array<{ target_field: TargetField; source_column: string; confidence: number }> {
    const results: Array<{ target_field: TargetField; source_column: string; confidence: number }> = [];
    const claimed = new Set<string>();

    // Pass 1 — exact alias matches claim their header
    const fuzzyFields: [TargetField, string[]][] = [];
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [TargetField, string[]][]) {
      const exactMatch = headers.find(
        (h) => !claimed.has(h) && aliases.some((a) => a.toLowerCase() === h.toLowerCase()),
      );

      if (exactMatch) {
        results.push({ target_field: field, source_column: exactMatch, confidence: 1.0 });
        claimed.add(exactMatch);
      } else {
        fuzzyFields.push([field, aliases]);
      }
    }

    // Pass 2 — fuzzy match only over headers no other field has claimed.
    // High bar (0.65): a wrong auto-mapping (e.g. phone ← "BILL NO.") is far
    // worse than leaving the field for the user to map manually.
    for (const [field, aliases] of fuzzyFields) {
      const available = headers.filter((h) => !claimed.has(h));
      if (available.length === 0) break;

      const fuse = new Fuse(available, { includeScore: true, threshold: 0.4 });
      let bestMatch: { source_column: string; confidence: number } | null = null;

      for (const alias of aliases) {
        const res = fuse.search(alias);
        if (res.length > 0 && res[0].score !== undefined) {
          const conf = 1 - res[0].score;
          if (!bestMatch || conf > bestMatch.confidence) {
            bestMatch = { source_column: res[0].item, confidence: conf };
          }
        }
      }

      if (bestMatch && bestMatch.confidence > 0.65) {
        results.push({ target_field: field, source_column: bestMatch.source_column, confidence: bestMatch.confidence });
        claimed.add(bestMatch.source_column);
      }
    }

    return results;
  }

  private applyMapping(
    row: Record<string, string>,
    mappings: ColumnMapping[],
  ): Partial<Record<TargetField, string>> {
    const result: Partial<Record<TargetField, string>> = {};
    for (const mapping of mappings) {
      result[mapping.target_field] = row[mapping.source_column] ?? '';
    }
    return result;
  }

  private validateRow(
    mapped: Partial<Record<TargetField, string>>,
    rowNum: number,
  ): Array<{ row: number; field: string; message: string; raw_value?: string }> {
    const errors: Array<{ row: number; field: string; message: string; raw_value?: string }> = [];

    if (!mapped.customer_name?.trim()) {
      errors.push({ row: rowNum, field: 'customer_name', message: 'Customer name is required' });
    }

    if (!mapped.invoice_number?.trim()) {
      errors.push({ row: rowNum, field: 'invoice_number', message: 'Invoice number is required' });
    }

    if (mapped.due_amount !== undefined) {
      const val = parseFloat(String(mapped.due_amount).replace(/[^0-9.\-]/g, ''));
      if (isNaN(val)) {
        errors.push({ row: rowNum, field: 'due_amount', message: 'Invalid amount', raw_value: mapped.due_amount });
      }
    }

    if (mapped.invoice_date && !parseIndianDate(String(mapped.invoice_date))) {
      errors.push({ row: rowNum, field: 'invoice_date', message: 'Invalid date format (expected DD/MM/YYYY)', raw_value: mapped.invoice_date });
    }

    return errors;
  }
}
