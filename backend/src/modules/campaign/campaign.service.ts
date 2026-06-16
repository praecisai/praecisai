import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateCampaignDto {
  @IsString() name!: string;
  @IsEnum(['WHATSAPP', 'CALL', 'EMAIL', 'SMS']) type!: string;
  @IsOptional() @IsDateString() scheduled_at?: string;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'PAUSED', 'CANCELLED']) status?: string;
  @IsOptional() @IsDateString() scheduled_at?: string;
}

@Injectable()
export class CampaignService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { business_id: businessId },
        skip, take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.campaign.count({ where: { business_id: businessId } }),
    ]);
    return { data, total, page, limit };
  }

  async findById(businessId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, business_id: businessId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async create(businessId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        business_id: businessId,
        name: dto.name,
        type: dto.type as any,
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
      },
    });
  }

  async update(businessId: string, id: string, dto: UpdateCampaignDto) {
    await this.findById(businessId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
        status: dto.status as any,
      },
    });
  }

  async remove(businessId: string, id: string) {
    await this.findById(businessId, id);
    return this.prisma.campaign.delete({ where: { id } });
  }
}
