import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdcStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';

// PDC Excel field aliases — detects columns in any order
const PDC_ALIASES = {
  party_name: ['Party Name', 'Party', 'Customer Name', 'Customer', 'Name', 'Client'],
  cheque_no:  ['Cheque No', 'Cheque Number', 'Chq No', 'Chq Number', 'Check No', 'Cheque No.'],
  cheque_date:['Date', 'Cheque Date', 'Chq Date', 'Payment Date', 'Dated'],
  amount:     ['Amount', 'Cheque Amount', 'Value', 'Rs', 'Amount (Rs)', 'Amount (₹)'],
};

function parseExcelRows(buffer: Buffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: '', raw: false, dateNF: 'DD/MM/YYYY',
  });
  return json.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) out[String(k).trim()] = String(v ?? '').trim();
    return out;
  });
}

function autoDetectColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(PDC_ALIASES)) {
    const exact = headers.find(h => aliases.some(a => a.toLowerCase() === h.toLowerCase()));
    if (exact) { mapping[field] = exact; continue; }
    const fuse = new Fuse(headers, { includeScore: true, threshold: 0.4 });
    let best: { col: string; score: number } | null = null;
    for (const alias of aliases) {
      const res = fuse.search(alias);
      if (res.length > 0 && res[0].score !== undefined) {
        const conf = 1 - res[0].score;
        if (!best || conf > best.score) best = { col: res[0].item, score: conf };
      }
    }
    if (best && best.score > 0.5) mapping[field] = best.col;
  }
  return mapping;
}

function parseDateFlexible(raw: string): Date | null {
  if (!raw) return null;
  // DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY
  const parts = raw.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (c > 1000) return new Date(c, b - 1, a); // DD/MM/YYYY
    if (a > 1000) return new Date(a, b - 1, c); // YYYY-MM-DD
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

const PDC_COOLDOWN_DAYS = 15;

@Injectable()
export class PdcService {
  private readonly logger = new Logger(PdcService.name);

  constructor(private prisma: PrismaService) {}

  // Prisma client may not have PDC models typed until server restart regenerates client
  private get db() { return this.prisma as any; }

  // ─── Upload & Parse PDC Excel ────────────────────────────────────────────────

  async uploadPdc(businessId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    const rows = parseExcelRows(file.buffer);
    if (rows.length === 0) throw new BadRequestException('Excel file is empty');

    const headers = Object.keys(rows[0]);
    const colMap = autoDetectColumns(headers);

    const required = ['party_name', 'cheque_no', 'amount'];
    const missing = required.filter(f => !colMap[f]);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Could not detect columns: ${missing.join(', ')}. Expected headers like "Party Name", "Cheque No", "Amount".`
      );
    }

    // Load all customers for fuzzy matching
    const customers = await this.prisma.customer.findMany({
      where: { business_id: businessId },
      select: { id: true, customer_name: true },
    });
    const fuse = new Fuse(customers, { keys: ['customer_name'], threshold: 0.35, includeScore: true });

    // Create upload batch
    const batch = await this.db.pdcUploadHistory.create({
      data: { business_id: businessId, file_name: file.originalname, records_total: rows.length },
    });

    let matched = 0;
    const chequeRows: Record<string, any>[] = [];

    for (const row of rows) {
      const partyName = row[colMap.party_name]?.trim();
      const chequeNo  = row[colMap.cheque_no]?.trim();
      const amountRaw = row[colMap.amount]?.replace(/[^0-9.]/g, '');
      const amount    = parseFloat(amountRaw) || 0;
      const dateRaw   = colMap.cheque_date ? row[colMap.cheque_date] : '';
      const chequeDate = parseDateFlexible(dateRaw) ?? new Date();

      if (!partyName || !chequeNo || amount <= 0) continue;

      // Fuzzy match to customer
      const results = fuse.search(partyName);
      let customerId: string | null = null;
      if (results.length > 0 && results[0].score !== undefined && 1 - results[0].score > 0.65) {
        customerId = results[0].item.id;
        matched++;
      }

      chequeRows.push({
        business_id: businessId,
        ...(customerId ? { customer_id: customerId } : {}),
        upload_batch_id: batch.id,
        party_name: partyName,
        cheque_no: chequeNo,
        cheque_date: chequeDate,
        amount,
      });
    }

    if (chequeRows.length > 0) {
      for (const row of chequeRows) {
        await this.db.pdcCheque.create({ data: row });
      }
    }

    await this.db.pdcUploadHistory.update({
      where: { id: batch.id },
      data: { records_total: chequeRows.length, records_matched: matched },
    });

    return {
      batch_id: batch.id,
      records_total: chequeRows.length,
      records_matched: matched,
      records_unmatched: chequeRows.length - matched,
      columns_detected: colMap,
    };
  }

  // ─── Called by OutstandingService after each recalculation ──────────────────
  // Detects which cheques cleared based on outstanding amount decrease

  async detectClearedCheques(businessId: string, customerId: string, oldDue: number, newDue: number) {
    if (newDue >= oldDue || newDue < 0) return; // no decrease

    const amountCleared = oldDue - newDue;

    const pendingCheques = await this.db.pdcCheque.findMany({
      where: { customer_id: customerId, business_id: businessId, status: PdcStatus.PENDING },
      orderBy: { cheque_date: 'asc' },
    });

    if (pendingCheques.length === 0) return;

    // FIFO by cheque date — match cleared amount to cheques
    let remaining = amountCleared;
    const clearedIds: string[] = [];
    let totalCleared = 0;

    for (const cheque of pendingCheques) {
      if (remaining <= 0) break;
      if (cheque.amount <= remaining + 1) { // +1 for rounding tolerance
        clearedIds.push(cheque.id);
        remaining -= cheque.amount;
        totalCleared += cheque.amount;
      }
    }

    if (clearedIds.length === 0) return;

    const now = new Date();
    const cooldownUntil = new Date(now.getTime() + PDC_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    await Promise.all([
      this.db.pdcCheque.updateMany({
        where: { id: { in: clearedIds } },
        data: { status: PdcStatus.CLEARED, cleared_date: now },
      }),
      this.prisma.outstanding.update({
        where: { customer_id: customerId },
        data: {
          pdc_cooldown_until: cooldownUntil,
          total_pdc_cleared: { increment: totalCleared },
        },
      }),
    ]);

    // Update batch cleared count
    const batchIds = [...new Set(
      (await this.db.pdcCheque.findMany({
        where: { id: { in: clearedIds } },
        select: { upload_batch_id: true },
      })).map(r => r.upload_batch_id)
    )];

    for (const batchId of batchIds) {
      await this.db.pdcUploadHistory.update({
        where: { id: batchId },
        data: { records_cleared: { increment: clearedIds.length } },
      });
    }

    this.logger.log(
      `PDC: ${clearedIds.length} cheque(s) cleared for customer ${customerId}. ` +
      `Amount: ₹${totalCleared.toLocaleString('en-IN')}. Cooldown until: ${cooldownUntil.toLocaleDateString('en-IN')}`
    );
  }

  // ─── List cheques ────────────────────────────────────────────────────────────

  async listCheques(businessId: string, filters: {
    status?: string; page?: number; limit?: number; search?: string;
  } = {}) {
    const { status, page = 1, limit = 20, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = { business_id: businessId };
    if (status && status !== 'ALL') where.status = status;
    if (search) where.party_name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.db.pdcCheque.findMany({
        where, skip, take: limit,
        orderBy: [{ cheque_date: 'desc' }, { created_at: 'desc' }],
        include: {
          customer: { select: { id: true, customer_name: true, phone: true } },
          upload_batch: { select: { file_name: true, created_at: true } },
        },
      }),
      this.db.pdcCheque.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  async getStats(businessId: string) {
    const [pending, cleared, bounced, totalAmountAgg, clearedAmountAgg, uploads] = await Promise.all([
      this.db.pdcCheque.count({ where: { business_id: businessId, status: 'PENDING' } }),
      this.db.pdcCheque.count({ where: { business_id: businessId, status: 'CLEARED' } }),
      this.db.pdcCheque.count({ where: { business_id: businessId, status: 'BOUNCED' } }),
      this.db.pdcCheque.aggregate({
        where: { business_id: businessId },
        _sum: { amount: true },
      }),
      this.db.pdcCheque.aggregate({
        where: { business_id: businessId, status: 'CLEARED' },
        _sum: { amount: true },
      }),
      this.db.pdcUploadHistory.count({ where: { business_id: businessId } }),
    ]);

    // Customers currently in PDC cooldown
    const inCooldown = await this.prisma.outstanding.count({
      where: {
        business_id: businessId,
        pdc_cooldown_until: { gte: new Date() },
      },
    });

    return {
      total: pending + cleared + bounced,
      pending,
      cleared,
      bounced,
      in_cooldown: inCooldown,
      total_amount: totalAmountAgg._sum.amount ?? 0,
      cleared_amount: clearedAmountAgg._sum.amount ?? 0,
      uploads,
    };
  }

  // ─── Manual status update ─────────────────────────────────────────────────────

  async updateStatus(businessId: string, chequeId: string, status: PdcStatus, notes?: string) {
    const cheque = await this.db.pdcCheque.findFirst({
      where: { id: chequeId, business_id: businessId },
    });
    if (!cheque) throw new BadRequestException('Cheque not found');

    return this.db.pdcCheque.update({
      where: { id: chequeId },
      data: {
        status,
        notes: notes ?? cheque.notes,
        cleared_date: status === PdcStatus.CLEARED ? new Date() : cheque.cleared_date,
      },
    });
  }

  // ─── Check if customer is in PDC cooldown (used before dispatch) ─────────────

  async isInCooldown(businessId: string, customerId: string): Promise<{ active: boolean; until?: Date }> {
    const outstanding = await this.prisma.outstanding.findFirst({
      where: { business_id: businessId, customer_id: customerId },
      select: { pdc_cooldown_until: true },
    });
    const until = outstanding?.pdc_cooldown_until;
    if (until && until > new Date()) return { active: true, until };
    return { active: false };
  }

  // ─── Upload history ──────────────────────────────────────────────────────────

  async getUploadHistory(businessId: string) {
    return this.db.pdcUploadHistory.findMany({
      where: { business_id: businessId },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { _count: { select: { cheques: true } } },
    });
  }
}
