import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OutstandingService } from '../outstanding/outstanding.service';
import { parseSegmentRules, DEFAULT_SEGMENT_RULES } from '../../common/utils/segment.util';
import { IsString, IsOptional, IsEnum, IsArray, MinLength, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { StrictOptionalBoolean } from '../../common/decorators/strict-boolean.decorator';

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;

  @IsOptional()
  @IsEnum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
  plan?: string;

  // [{min_days, max_days, segment}]: validated structurally in the service.
  // @Type(() => Object) is REQUIRED: without it, the global ValidationPipe's
  // enableImplicitConversion casts each element to the property's design type
  // (Array), silently corrupting every saved rule into [] (this was live
  // in production: all stored segment_rules were [[],[],...]).
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  segment_rules?: Array<{ min_days: number; max_days: number | null; segment: string }>;

  // Number the AI transfers to on a "talk to a human/senior" request.
  // Empty string clears it (call falls back to the platform default number).
  @IsOptional()
  @IsString()
  @Matches(/^(\+?[0-9]{10,15})?$/, {
    message: 'handoff_number must be a phone number like +919876543210 (or empty to use the default)',
  })
  handoff_number?: string;

  // VIP-only override: { min_days, max_days, segment }: null clears it.
  // Validated structurally in the service.
  @IsOptional()
  vip_rule?: { min_days: number; max_days: number | null; segment: string } | null;

  // Language the AI recovery agent speaks on calls. Must match the tenant's
  // Bolna agent primary language.
  @IsOptional()
  @IsEnum(['HINDI', 'ENGLISH'])
  call_language?: string;

  // Master switch for the unattended 12:00 / 16:00 IST calling runs.
  // Declared `unknown` on purpose: see StrictOptionalBoolean. A plain
  // `boolean` would let the ValidationPipe coerce "false"/"yes" into `true`
  // and silently start automatic dialing.
  @StrictOptionalBoolean()
  auto_calls_enabled?: unknown;

  // Master switch for the unattended 10:00 IST WhatsApp statement run.
  // Same strict-boolean treatment as auto_calls_enabled: a coerced "false"
  // would silently start messaging every party in the ledger.
  @StrictOptionalBoolean()
  auto_whatsapp_enabled?: unknown;

  // { "Soft Reminder": 15, "Follow-up": 7, ... } — days between automated
  // statements per segment. Validated in the service.
  @IsOptional()
  @Type(() => Object)
  whatsapp_cadence_days?: Record<string, number> | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  daily_whatsapp_cap?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  daily_call_cap?: number;
}

// Segments the AI can actually speak: the VIP override must map to one of these
const CONTACT_SEGMENTS = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation'];

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private outstandingService: OutstandingService,
  ) {}

  async findById(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    await this.findById(id);

    // Validate segment rules structurally + logically before persisting
    if (dto.segment_rules !== undefined) {
      const parsed = parseSegmentRules(dto.segment_rules);
      if (parsed === DEFAULT_SEGMENT_RULES && dto.segment_rules.length > 0) {
        throw new BadRequestException('Invalid segment rules format');
      }
      const sorted = [...parsed].sort((a, b) => a.min_days - b.min_days);
      for (let i = 0; i < sorted.length; i++) {
        const max = sorted[i].max_days;
        if (max !== null && max < sorted[i].min_days) {
          throw new BadRequestException('Segment rule max_days must be >= min_days');
        }
        if (i < sorted.length - 1 && (max === null || sorted[i + 1].min_days !== max + 1)) {
          throw new BadRequestException('Segment rules must be contiguous (next min = previous max + 1)');
        }
      }
      if (sorted[sorted.length - 1].max_days !== null) {
        throw new BadRequestException('Last segment rule must be open-ended (max_days = null)');
      }
    }

    // VIP rule: editable start AND end, plus which segment's call/template
    // to use for VIPs inside that range
    if (dto.vip_rule !== undefined && dto.vip_rule !== null) {
      const r = dto.vip_rule;
      if (
        typeof r?.min_days !== 'number' || r.min_days < 0 ||
        (r?.max_days !== null && (typeof r?.max_days !== 'number' || r.max_days < r.min_days)) ||
        !CONTACT_SEGMENTS.includes(r?.segment)
      ) {
        throw new BadRequestException(
          `vip_rule needs min_days >= 0, max_days >= min_days (or null), and a segment out of: ${CONTACT_SEGMENTS.join(', ')}`,
        );
      }
    }

    // WhatsApp cadence override: every key must be a contactable segment and
    // every value a sane day count. A bad value here would mean messaging the
    // same party daily, which is the fastest way to lose a WhatsApp number.
    if (dto.whatsapp_cadence_days !== undefined && dto.whatsapp_cadence_days !== null) {
      for (const [segment, value] of Object.entries(dto.whatsapp_cadence_days)) {
        if (!CONTACT_SEGMENTS.includes(segment)) {
          throw new BadRequestException(
            `whatsapp_cadence_days key "${segment}" is not a contactable segment. Allowed: ${CONTACT_SEGMENTS.join(', ')}`,
          );
        }
        const days = Number(value);
        if (!Number.isFinite(days) || days < 1 || days > 365) {
          throw new BadRequestException(
            `whatsapp_cadence_days["${segment}"] must be between 1 and 365 days`,
          );
        }
      }
    }

    const { vip_rule, whatsapp_cadence_days, ...rest } = dto;
    const data: any = { ...rest };
    if (vip_rule !== undefined) data.vip_rule = vip_rule === null ? Prisma.DbNull : vip_rule;
    if (whatsapp_cadence_days !== undefined) {
      data.whatsapp_cadence_days =
        whatsapp_cadence_days === null ? Prisma.DbNull : whatsapp_cadence_days;
    }

    const updated = await this.prisma.business.update({
      where: { id },
      data,
    });

    // Changed ranges re-segment every customer immediately
    if (dto.segment_rules !== undefined) {
      const customers = await this.prisma.customer.findMany({
        where: { business_id: id },
        select: { id: true },
      });
      await this.outstandingService.bulkRecalculate(id, customers.map((c) => c.id));
    }

    return updated;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.business.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
      this.prisma.business.count(),
    ]);
    return { data, total, page, limit };
  }
}
