import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutstandingService } from '../outstanding/outstanding.service';
import { Prisma } from '@prisma/client';
import { IsString, IsOptional, IsEmail, IsBoolean, IsArray } from 'class-validator';
import * as XLSX from 'xlsx';

export class CreateCustomerDto {
  @IsString() customer_name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsBoolean() is_vip?: boolean;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() customer_name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsBoolean() is_vip?: boolean;
  // Per-customer segment day ranges (same shape as business segment_rules);
  // null clears the override. Validated structurally in the service.
  @IsOptional() custom_schedule?: Array<{ min_days: number; max_days: number | null; segment: string }> | null;
}

export class CustomerFiltersDto {
  @IsOptional() search?: string;
  @IsOptional() city?: string;
  @IsOptional() segment?: string;
  @IsOptional() agent?: string;
  @IsOptional() tag?: string;
  @IsOptional() is_vip?: boolean;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

@Injectable()
export class CustomerService {
  constructor(
    private prisma: PrismaService,
    private outstandingService: OutstandingService,
  ) {}

  async findAll(businessId: string, filters: CustomerFiltersDto = {}) {
    const { search, city, segment, agent, tag, is_vip, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { business_id: businessId };

    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city) where.city = { equals: city, mode: 'insensitive' };
    if (agent) where.assigned_agent = { equals: agent, mode: 'insensitive' };
    if (is_vip !== undefined) where.is_vip = is_vip;
    if (tag) where.tags = { has: tag };
    // "VIP" pseudo-segment mirrors the Outstandings dropdown
    if (segment === 'VIP') where.is_vip = true;
    else if (segment) where.outstanding = { is: { segment } };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { outstanding: true },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, business_id: businessId },
      include: {
        invoices: { orderBy: { invoice_date: 'desc' } },
        outstanding: true,
        promises_to_pay: { orderBy: { created_at: 'desc' } },
        whatsapp_logs: { orderBy: { created_at: 'desc' }, take: 20 },
        call_logs: {
          orderBy: { created_at: 'desc' },
          take: 20,
          select: {
            id: true,
            call_status: true,
            disposition: true,
            call_summary: true,
            promise_date: true,
            duration_seconds: true,
            created_at: true,
            business_id: true,
            customer_id: true,
            retell_call_id: true
          }
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(businessId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { ...dto, business_id: businessId },
    });
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    await this.findById(businessId, id);

    const { custom_schedule, ...rest } = dto;
    const data: any = { ...rest };

    if (custom_schedule !== undefined) {
      if (custom_schedule !== null) this.validateSchedule(custom_schedule);
      data.custom_schedule = custom_schedule === null ? Prisma.DbNull : custom_schedule;
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data,
    });

    // A schedule change moves the customer between segments immediately
    if (custom_schedule !== undefined) {
      await this.outstandingService.recalculateForCustomer(businessId, id);
    }

    return updated;
  }

  // Same contiguity checks as business-level segment rules
  private validateSchedule(rules: Array<{ min_days: number; max_days: number | null; segment: string }>) {
    if (!Array.isArray(rules) || rules.length === 0) {
      throw new BadRequestException('custom_schedule must be a non-empty array of rules');
    }
    for (const r of rules) {
      if (
        typeof r?.min_days !== 'number' ||
        (r?.max_days !== null && typeof r?.max_days !== 'number') ||
        typeof r?.segment !== 'string'
      ) {
        throw new BadRequestException('Invalid custom_schedule rule format');
      }
    }
    const sorted = [...rules].sort((a, b) => a.min_days - b.min_days);
    for (let i = 0; i < sorted.length; i++) {
      const max = sorted[i].max_days;
      if (max !== null && max < sorted[i].min_days) {
        throw new BadRequestException('custom_schedule max_days must be >= min_days');
      }
      if (i < sorted.length - 1 && (max === null || sorted[i + 1].min_days !== max + 1)) {
        throw new BadRequestException('custom_schedule rules must be contiguous');
      }
    }
    if (sorted[sorted.length - 1].max_days !== null) {
      throw new BadRequestException('Last custom_schedule rule must be open-ended (max_days = null)');
    }
  }

  async remove(businessId: string, id: string) {
    await this.findById(businessId, id);
    return this.prisma.customer.delete({ where: { id } });
  }

  async getCities(businessId: string): Promise<string[]> {
    const result = await this.prisma.customer.findMany({
      where: { business_id: businessId, city: { not: null } },
      select: { city: true },
      distinct: ['city'],
    });
    return result.map((r) => r.city!).filter(Boolean);
  }

  async getAgents(businessId: string): Promise<string[]> {
    const result = await this.prisma.customer.findMany({
      where: { business_id: businessId, assigned_agent: { not: null } },
      select: { assigned_agent: true },
      distinct: ['assigned_agent'],
      orderBy: { assigned_agent: 'asc' },
    });
    return result.map((r) => r.assigned_agent!).filter(Boolean);
  }

  // ─── VIP Excel import ────────────────────────────────────────────────────────
  // The client uploads an Excel with a party-name column and a VIP column
  // (Yes/No). "Yes" stars the customer, "No" un-stars; blank leaves unchanged.
  // VIPs are excluded from ALL automated calls/messages.
  async importVipExcel(businessId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      throw new BadRequestException('Only .xlsx, .xls, and .csv files are supported');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const grid = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '', raw: false }) as any[][];
    if (grid.length === 0) throw new BadRequestException('The file is empty');

    // Find the header row: needs a party/name column AND a VIP column
    let headerIdx = -1;
    let nameCol = -1;
    let vipCol = -1;
    for (let i = 0; i < Math.min(grid.length, 15); i++) {
      const cells = (grid[i] ?? []).map((c) => String(c ?? '').trim().toLowerCase());
      const n = cells.findIndex((c) => /^(party|party name|customer|customer name|name|client)$/.test(c));
      const v = cells.findIndex((c) => /vip/.test(c));
      if (n >= 0 && v >= 0) {
        headerIdx = i;
        nameCol = n;
        vipCol = v;
        break;
      }
    }
    if (headerIdx === -1) {
      throw new BadRequestException(
        'Could not find the columns — the file needs a PARTY (or Customer Name) column and a VIP column with Yes/No values',
      );
    }

    // Existing customers keyed by normalized name (with and without city suffix)
    const customers = await this.prisma.customer.findMany({
      where: { business_id: businessId },
      select: { id: true, customer_name: true, is_vip: true },
    });
    const byName = new Map<string, { id: string; is_vip: boolean }>();
    for (const c of customers) byName.set(c.customer_name.trim().toLowerCase(), c);

    const stripCity = (name: string) => name.replace(/\s+-\s*[A-Za-z0-9 .()&'\/]+$/, '').trim();

    const toStar: string[] = [];
    const toUnstar: string[] = [];
    const unmatched: string[] = [];
    let rowsRead = 0;

    for (let i = headerIdx + 1; i < grid.length; i++) {
      const row = grid[i] ?? [];
      const rawName = String(row[nameCol] ?? '').trim();
      const rawVip = String(row[vipCol] ?? '').trim().toLowerCase();
      if (!rawName || /^(party|grand|sub)?\s*totals?$/i.test(rawName)) continue;
      if (!rawVip) continue; // blank VIP cell = leave unchanged

      rowsRead++;
      const isVip = /^(yes|y|true|1)$/.test(rawVip);
      const isNotVip = /^(no|n|false|0)$/.test(rawVip);
      if (!isVip && !isNotVip) continue;

      const match =
        byName.get(rawName.toLowerCase()) ?? byName.get(stripCity(rawName).toLowerCase());
      if (!match) {
        unmatched.push(rawName);
        continue;
      }
      if (isVip && !match.is_vip) toStar.push(match.id);
      if (isNotVip && match.is_vip) toUnstar.push(match.id);
    }

    if (toStar.length) {
      await this.prisma.customer.updateMany({
        where: { id: { in: toStar }, business_id: businessId },
        data: { is_vip: true },
      });
    }
    if (toUnstar.length) {
      await this.prisma.customer.updateMany({
        where: { id: { in: toUnstar }, business_id: businessId },
        data: { is_vip: false },
      });
    }

    return {
      success: true,
      rows_read: rowsRead,
      starred: toStar.length,
      unstarred: toUnstar.length,
      unmatched: unmatched.slice(0, 50),
      unmatched_count: unmatched.length,
      message: `${toStar.length} customer(s) marked VIP, ${toUnstar.length} removed${unmatched.length ? ` — ${unmatched.length} name(s) not found` : ''}`,
    };
  }
}
