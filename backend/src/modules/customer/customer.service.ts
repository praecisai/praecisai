import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsEmail, IsBoolean, IsArray } from 'class-validator';

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
}

export class CustomerFiltersDto {
  @IsOptional() search?: string;
  @IsOptional() city?: string;
  @IsOptional() segment?: string;
  @IsOptional() tag?: string;
  @IsOptional() is_vip?: boolean;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string, filters: CustomerFiltersDto = {}) {
    const { search, city, segment, tag, is_vip, page = 1, limit = 20 } = filters;
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
    if (is_vip !== undefined) where.is_vip = is_vip;
    if (tag) where.tags = { has: tag };
    if (segment) where.outstanding = { is: { segment } };

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
    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
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
}
