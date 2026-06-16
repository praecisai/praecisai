import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreatePTPDto {
  @IsString() customer_id!: string;
  @IsNumber() promised_amount!: number;
  @IsDateString() promised_date!: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePTPDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() promised_date?: string;
}

@Injectable()
export class PromiseToPayService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.promiseToPay.findMany({
        where: { business_id: businessId }, skip, take: limit,
        orderBy: { promised_date: 'asc' },
        include: { customer: { select: { id: true, customer_name: true } } },
      }),
      this.prisma.promiseToPay.count({ where: { business_id: businessId } }),
    ]);
    return { data, total, page, limit };
  }

  async findByCustomer(businessId: string, customerId: string) {
    return this.prisma.promiseToPay.findMany({
      where: { business_id: businessId, customer_id: customerId },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(businessId: string, dto: CreatePTPDto) {
    return this.prisma.promiseToPay.create({
      data: {
        business_id: businessId,
        customer_id: dto.customer_id,
        promised_amount: dto.promised_amount,
        promised_date: new Date(dto.promised_date),
        notes: dto.notes,
      },
    });
  }

  async update(businessId: string, id: string, dto: UpdatePTPDto) {
    const ptp = await this.prisma.promiseToPay.findFirst({ where: { id, business_id: businessId } });
    if (!ptp) throw new NotFoundException('Promise to pay not found');
    return this.prisma.promiseToPay.update({
      where: { id },
      data: {
        ...dto,
        promised_date: dto.promised_date ? new Date(dto.promised_date) : undefined,
        status: dto.status as any,
      },
    });
  }
}
