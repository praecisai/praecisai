import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutstandingService } from '../outstanding/outstanding.service';
import { parseSegmentRules, DEFAULT_SEGMENT_RULES } from '../../common/utils/segment.util';
import { IsString, IsOptional, IsEnum, IsArray, MinLength, Matches } from 'class-validator';

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

  // [{min_days, max_days, segment}]: validated structurally in the service
  @IsOptional()
  @IsArray()
  segment_rules?: Array<{ min_days: number; max_days: number | null; segment: string }>;

  // Number the AI transfers to on a "talk to a human/senior" request.
  // Empty string clears it (call falls back to the platform default number).
  @IsOptional()
  @IsString()
  @Matches(/^(\+?[0-9]{10,15})?$/, {
    message: 'handoff_number must be a phone number like +919876543210 (or empty to use the default)',
  })
  handoff_number?: string;
}

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

    const updated = await this.prisma.business.update({
      where: { id },
      data: dto as any,
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
