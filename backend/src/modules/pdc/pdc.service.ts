import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdcStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';

// PDC Excel field aliases: detects columns in any order.
//
// `cheque_date` is listed most-specific-first because a real Tally PDC export
// carries BOTH a receive date and a cheque date ("Cheque Recive Date",
// "Cheque Date"). Exact matching walks the header row, so without the specific
// alias the wrong column can win and every cheque lands with the date it was
// handed over rather than the date it is payable.
const PDC_ALIASES = {
  party_name: ['Party Name', 'Party', 'Customer Name', 'Customer', 'Name', 'Client'],
  cheque_no:  ['Cheque No', 'Cheque Number', 'Chq No', 'Chq Number', 'Check No', 'Cheque No.'],
  cheque_date:['Cheque Date', 'Chq Date', 'Date', 'Payment Date', 'Dated', 'Due Date'],
  amount:     [
    'Amount', 'Amt', 'Cheque Amount', 'Cheque Amt', 'Chq Amount', 'Chq Amt',
    'Value', 'Rs', 'Amount (Rs)', 'Amount (₹)', 'Amount Rs', 'Cheque Value',
  ],
};

// Headers that must never be picked for `cheque_date`: they describe when the
// cheque was received, not when it can be banked.
const RECEIVE_DATE_HINTS = ['recive', 'receive', 'recd', 'received', 'entry'];

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
    // A receive/entry date must never be mistaken for the cheque date.
    const pool =
      field === 'cheque_date'
        ? headers.filter(
            (h) => !RECEIVE_DATE_HINTS.some((hint) => h.toLowerCase().includes(hint)),
          )
        : headers;
    if (pool.length === 0) continue;

    // Aliases are ordered most-specific-first, so try them in order rather
    // than walking the header row: "Cheque Date" must beat a bare "Date".
    const exact = aliases
      .map((a) => pool.find((h) => h.toLowerCase() === a.toLowerCase()))
      .find(Boolean);
    if (exact) { mapping[field] = exact; continue; }

    const fuse = new Fuse(pool, { includeScore: true, threshold: 0.4 });
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
  // DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY or YYYY-MM-DD
  const parts = raw.trim().split(/[\/\-.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if ([a, b, c].every((n) => Number.isFinite(n))) {
      if (c > 1000) return new Date(c, b - 1, a); // DD/MM/YYYY
      if (a > 1000) return new Date(a, b - 1, c); // YYYY-MM-DD
    }
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Accounting exports pad names and append the city:
 * "SOCIETY (BHANDUP)        -MUMBAI". Customers are stored with the suffix
 * already split off, so both sides are normalized before fuzzy matching.
 */
function normalizePartyName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const suffix = collapsed.match(/^(.*\S)\s+-\s*[A-Za-z0-9 .()&'\/]+$/);
  return (suffix ? suffix[1] : collapsed).trim();
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

    // Load all customers for matching. `match_name` is the normalized form so
    // padded/city-suffixed names from the cheque file line up with stored ones.
    const customers = await this.prisma.customer.findMany({
      where: { business_id: businessId },
      select: { id: true, customer_name: true },
    });
    const candidates = customers.map((c) => ({
      ...c,
      match_name: normalizePartyName(c.customer_name),
    }));
    const exactByName = new Map<string, string>();
    for (const c of candidates) exactByName.set(c.match_name.toLowerCase(), c.id);

    const fuse = new Fuse(candidates, { keys: ['match_name'], threshold: 0.35, includeScore: true });

    // Create upload batch
    const batch = await this.db.pdcUploadHistory.create({
      data: { business_id: businessId, file_name: file.originalname, records_total: rows.length },
    });

    // Re-upload guard. PDC files are cumulative in practice: the same register
    // gets exported again next week with a few new rows appended. Without this,
    // every re-upload duplicates every cheque, which then double-counts against
    // the next outstanding decrease and clears cheques that were never banked.
    // Identity = party + cheque number + amount, scoped to the business.
    const existing = await this.db.pdcCheque.findMany({
      where: { business_id: businessId },
      select: { party_name: true, cheque_no: true, amount: true },
    });
    const chequeKey = (party: string, no: string, amt: number) =>
      `${party.toLowerCase()}|${no.toLowerCase()}|${amt.toFixed(2)}`;
    const alreadyStored = new Set<string>(
      existing.map((c: any) => chequeKey(c.party_name, c.cheque_no, c.amount)),
    );

    let matched = 0;
    let skipped = 0;
    let duplicates = 0;
    const seenInFile = new Set<string>();
    const chequeRows: Record<string, any>[] = [];

    for (const row of rows) {
      const partyName = row[colMap.party_name]?.trim();
      const chequeNo  = row[colMap.cheque_no]?.trim();
      const amountRaw = row[colMap.amount]?.replace(/[^0-9.]/g, '');
      const amount    = parseFloat(amountRaw) || 0;
      const dateRaw   = colMap.cheque_date ? row[colMap.cheque_date] : '';
      const chequeDate = parseDateFlexible(dateRaw) ?? new Date();

      if (!partyName || !chequeNo || amount <= 0) {
        skipped++;
        continue;
      }

      // Exact name first, fuzzy only as a fallback
      const lookupName = normalizePartyName(partyName);

      // Skip anything already on file, and anything repeated inside this file.
      const key = chequeKey(lookupName || partyName, chequeNo, amount);
      if (alreadyStored.has(key) || seenInFile.has(key)) {
        duplicates++;
        continue;
      }
      seenInFile.add(key);

      let customerId: string | null = exactByName.get(lookupName.toLowerCase()) ?? null;
      if (!customerId) {
        const results = fuse.search(lookupName);
        if (results.length > 0 && results[0].score !== undefined && 1 - results[0].score > 0.65) {
          customerId = results[0].item.id;
        }
      }
      if (customerId) matched++;

      chequeRows.push({
        business_id: businessId,
        ...(customerId ? { customer_id: customerId } : {}),
        upload_batch_id: batch.id,
        // Store the tidied name so the PDC table reads cleanly
        party_name: lookupName || partyName,
        cheque_no: chequeNo,
        cheque_date: chequeDate,
        amount,
      });
    }

    if (chequeRows.length === 0) {
      // Nothing usable: drop the empty batch so history stays meaningful
      await this.db.pdcUploadHistory.delete({ where: { id: batch.id } }).catch(() => undefined);
      throw new BadRequestException(
        duplicates > 0
          ? `No new cheques in this file: all ${duplicates} row(s) are already on record. Re-uploading the same register is safe, nothing was duplicated.`
          : `No valid cheque rows found in this file. Every row needs a party name, a cheque number and an amount greater than zero (${skipped} row(s) were incomplete).`,
      );
    }

    // One statement instead of a query per cheque
    await this.db.pdcCheque.createMany({ data: chequeRows });

    await this.db.pdcUploadHistory.update({
      where: { id: batch.id },
      data: { records_total: chequeRows.length, records_matched: matched },
    });

    this.logger.log(
      `PDC upload "${file.originalname}": ${chequeRows.length} new cheque(s), ${matched} matched to customers, ` +
        `${duplicates} already on record, ${skipped} incomplete`,
    );

    return {
      batch_id: batch.id,
      records_total: chequeRows.length,
      records_matched: matched,
      records_duplicate: duplicates,
      records_unmatched: chequeRows.length - matched,
      records_skipped: skipped,
      columns_detected: colMap,
    };
  }

  // ─── Manual single-cheque entry ──────────────────────────────────────────────
  // Appended alongside uploaded cheques: same party-matching and dedup as upload,
  // grouped under a per-business "Manual entries" batch so the FK is satisfied
  // and it shows in history.
  async createCheque(
    businessId: string,
    dto: { party_name: string; cheque_no: string; cheque_date?: string; amount: number },
  ) {
    const partyName = (dto.party_name ?? '').trim();
    const chequeNo = (dto.cheque_no ?? '').trim();
    const amount = Number(dto.amount) || 0;
    if (!partyName || !chequeNo || amount <= 0) {
      throw new BadRequestException('Party name, cheque number and a positive amount are all required.');
    }
    const chequeDate = dto.cheque_date ? (parseDateFlexible(dto.cheque_date) ?? new Date()) : new Date();
    const lookupName = normalizePartyName(partyName);

    // Same identity as upload: party + cheque number + amount. Never double-count.
    const key = (p: string, n: string, a: number) => `${p.toLowerCase()}|${n.toLowerCase()}|${a.toFixed(2)}`;
    const existing = await this.db.pdcCheque.findMany({
      where: { business_id: businessId },
      select: { party_name: true, cheque_no: true, amount: true },
    });
    const target = key(lookupName || partyName, chequeNo, amount);
    if (existing.some((c: any) => key(c.party_name, c.cheque_no, c.amount) === target)) {
      throw new BadRequestException('This cheque is already on record (same party, number and amount).');
    }

    // Match to an existing customer: exact normalized name first, fuzzy fallback.
    const customers = await this.prisma.customer.findMany({
      where: { business_id: businessId },
      select: { id: true, customer_name: true },
    });
    const candidates = customers.map((c) => ({ ...c, match_name: normalizePartyName(c.customer_name) }));
    let customerId: string | null =
      candidates.find((c) => c.match_name.toLowerCase() === lookupName.toLowerCase())?.id ?? null;
    if (!customerId && candidates.length > 0) {
      const fuse = new Fuse(candidates, { keys: ['match_name'], threshold: 0.35, includeScore: true });
      const res = fuse.search(lookupName);
      if (res.length > 0 && res[0].score !== undefined && 1 - res[0].score > 0.65) {
        customerId = res[0].item.id;
      }
    }

    const MANUAL_BATCH = 'Manual entries';
    let batch = await this.db.pdcUploadHistory.findFirst({
      where: { business_id: businessId, file_name: MANUAL_BATCH },
      orderBy: { created_at: 'desc' },
    });
    if (!batch) {
      batch = await this.db.pdcUploadHistory.create({
        data: { business_id: businessId, file_name: MANUAL_BATCH },
      });
    }

    const cheque = await this.db.pdcCheque.create({
      data: {
        business_id: businessId,
        ...(customerId ? { customer_id: customerId } : {}),
        upload_batch_id: batch.id,
        party_name: lookupName || partyName,
        cheque_no: chequeNo,
        cheque_date: chequeDate,
        amount,
      },
    });
    await this.db.pdcUploadHistory.update({
      where: { id: batch.id },
      data: {
        records_total: { increment: 1 },
        ...(customerId ? { records_matched: { increment: 1 } } : {}),
      },
    });

    this.logger.log(
      `PDC manual entry: "${lookupName || partyName}" cheque ${chequeNo} ₹${amount} (${customerId ? 'matched' : 'unmatched'})`,
    );
    return { ...cheque, matched: !!customerId };
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

    // FIFO by cheque date: match cleared amount to cheques
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

    // Update each batch by the number of ITS OWN cheques that cleared. The
    // previous version incremented every touched batch by the full run count,
    // so a clearing that spanned two uploads reported double.
    const cleared = await this.db.pdcCheque.findMany({
      where: { id: { in: clearedIds } },
      select: { upload_batch_id: true },
    });
    const perBatch = new Map<string, number>();
    for (const c of cleared) {
      perBatch.set(c.upload_batch_id, (perBatch.get(c.upload_batch_id) ?? 0) + 1);
    }

    for (const [batchId, count] of perBatch) {
      await this.db.pdcUploadHistory.update({
        where: { id: batchId },
        data: { records_cleared: { increment: count } },
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
