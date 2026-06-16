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
  due_amount: ['Due Amount (₹)', 'Outstanding Amount', 'Balance Due', 'Amount Due', 'Due Amt', 'Outstanding', 'Due Amount', 'Balance'],
  days_overdue: ['Days Outstanding', 'Overdue Days', 'Aging Days', 'Days Overdue', 'Outstanding Days', 'Aging'],
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
    const previewRows = rows.slice(0, 5);

    const previewed = previewRows.map((row, index) => {
      const mapped = this.applyMapping(row, mappings);
      const errors = this.validateRow(mapped, index + 1);
      return { row_index: index + 1, mapped, raw: row, errors };
    });

    const totalErrors = previewed.flatMap((p) => p.errors);

    return {
      preview: previewed,
      validation_errors: totalErrors,
      total_rows: rows.length,
    };
  }

  // ─── STEP 3: Execute full import ────────────────────────────────────────────

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

    let imported = 0;
    let failed = 0;
    const errors: any[] = [];
    const customerIds = new Set<string>();

    let customersCreated = 0;
    let customersUpdated = 0;
    let invoicesCreated = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        const mapped = this.applyMapping(row, mappings);
        const rowErrors = this.validateRow(mapped, rowNum);

        if (rowErrors.some((e) => e.field === 'customer_name' || e.field === 'invoice_number')) {
          failed++;
          errors.push(...rowErrors);
          continue;
        }

        // Parse values
        const dueAmount = parseFloat(String(mapped.due_amount ?? '0').replace(/[^0-9.\-]/g, '')) || 0;
        const daysOverdue = parseInt(String(mapped.days_overdue ?? '0')) || 0;
        const phone = mapped.phone ? normalizePhone(mapped.phone) : null;
        const invoiceDate = mapped.invoice_date
          ? parseIndianDate(String(mapped.invoice_date))
          : new Date();

        // Skip credit notes (negative due amounts)
        // Still import the row but mark status appropriately

        // ── Upsert Customer ──────────────────────────────────────────────────
        let customer: any;
        if (phone) {
          customer = await this.prisma.customer.upsert({
            where: { phone_business_id: { phone, business_id: businessId } },
            create: {
              business_id: businessId,
              customer_name: String(mapped.customer_name ?? '').trim(),
              phone,
              city: mapped.city ? String(mapped.city).trim() : null,
            },
            update: {
              customer_name: String(mapped.customer_name ?? '').trim(),
              city: mapped.city ? String(mapped.city).trim() : undefined,
            },
          });

          // Track created vs updated
          if (customer.created_at === customer.updated_at) {
            customersCreated++;
          } else {
            customersUpdated++;
          }
        } else {
          // No phone — find by name + business or create
          const existing = await this.prisma.customer.findFirst({
            where: {
              business_id: businessId,
              customer_name: { equals: String(mapped.customer_name ?? '').trim(), mode: 'insensitive' },
            },
          });

          if (existing) {
            customer = existing;
            customersUpdated++;
          } else {
            customer = await this.prisma.customer.create({
              data: {
                business_id: businessId,
                customer_name: String(mapped.customer_name ?? '').trim(),
                city: mapped.city ? String(mapped.city).trim() : null,
              },
            });
            customersCreated++;
          }
        }

        customerIds.add(customer.id);

        // ── Upsert Invoice ───────────────────────────────────────────────────
        const invoiceNumber = String(mapped.invoice_number ?? '').trim();
        if (invoiceNumber) {
          const existingInvoice = await this.prisma.invoice.findUnique({
            where: {
              invoice_number_business_id: {
                invoice_number: invoiceNumber,
                business_id: businessId,
              },
            },
          });

          if (!existingInvoice) {
            await this.prisma.invoice.create({
              data: {
                business_id: businessId,
                customer_id: customer.id,
                invoice_number: invoiceNumber,
                invoice_date: invoiceDate ?? new Date(),
                amount: Math.abs(dueAmount),
                due_amount: dueAmount,
                days_overdue: daysOverdue,
                sales_agent: mapped.sales_agent ? String(mapped.sales_agent).trim() : null,
                status: dueAmount <= 0 ? 'PAID' : daysOverdue > 0 ? 'OVERDUE' : 'PENDING',
              },
            });
            invoicesCreated++;
          }
          // Deduplicate: skip if invoice already exists
        }

        imported++;
      } catch (err: any) {
        failed++;
        this.logger.error(`Row ${rowNum} failed: ${err.message}`);
        errors.push({ row: rowNum, field: 'unknown', message: err.message });
      }
    }

    // ── Recalculate Outstanding for all affected customers ───────────────────
    let outstandingUpdated = 0;
    for (const customerId of customerIds) {
      try {
        await this.outstandingService.recalculateForCustomer(businessId, customerId);
        outstandingUpdated++;
      } catch (err: any) {
        this.logger.error(`Outstanding recalc failed for ${customerId}: ${err.message}`);
      }
    }

    // Save template if requested
    if (templateName) {
      await this.saveTemplate(businessId, templateName, mappings);
    }

    // Update history
    await this.prisma.importHistory.update({
      where: { id: historyId },
      data: {
        status: failed === rows.length ? 'FAILED' : 'COMPLETED',
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
      customers_created: customersCreated,
      customers_updated: customersUpdated,
      invoices_created: invoicesCreated,
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

    const headers = (json[0] as string[]).map((h) => String(h ?? '').trim()).filter(Boolean);
    const rowCount = Math.max(0, json.length - 1);

    return { headers, rowCount };
  }

  private parseFile(buffer: Buffer, ext: string): Record<string, string>[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: '',
      raw: false,
      dateNF: 'DD/MM/YYYY',
    });

    return json.map((row) => {
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[String(k).trim()] = String(v ?? '').trim();
      }
      return normalized;
    });
  }

  private autoDetectMappings(headers: string[]): Array<{ target_field: TargetField; source_column: string; confidence: number }> {
    const results: Array<{ target_field: TargetField; source_column: string; confidence: number }> = [];

    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [TargetField, string[]][]) {
      // Try exact match first
      const exactMatch = headers.find((h) =>
        aliases.some((a) => a.toLowerCase() === h.toLowerCase()),
      );

      if (exactMatch) {
        results.push({ target_field: field, source_column: exactMatch, confidence: 1.0 });
        continue;
      }

      // Fuzzy match
      const fuse = new Fuse(headers, { includeScore: true, threshold: 0.4 });
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

      if (bestMatch && bestMatch.confidence > 0.5) {
        results.push({ target_field: field, source_column: bestMatch.source_column, confidence: bestMatch.confidence });
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
