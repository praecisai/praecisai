import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class InvoiceFiltersDto {
  @IsOptional() search?: string;
  @IsOptional() status?: string;
  @IsOptional() sales_agent?: string;
  @IsOptional() customer_id?: string;
  @IsOptional() date_from?: string;
  @IsOptional() date_to?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

export class CreateInvoiceDto {
  @IsString() customer_id!: string;
  @IsString() invoice_number!: string;
  @IsDateString() invoice_date!: string;
  @IsNumber() amount!: number;
  @IsNumber() due_amount!: number;
  @IsNumber() days_overdue!: number;
  @IsOptional() @IsString() sales_agent?: string;
  @IsOptional() @IsString() status?: string;
}

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string, filters: InvoiceFiltersDto = {}) {
    const { search, status, sales_agent, customer_id, date_from, date_to, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { business_id: businessId };
    if (status) where.status = status;
    if (sales_agent) where.sales_agent = { contains: sales_agent, mode: 'insensitive' };
    if (customer_id) where.customer_id = customer_id;
    // Whole-day bounds so bills dated ON the from/to dates are included.
    // (A bare new Date('2026-04-10') is midnight UTC, which excluded bills
    // stored at local midnight of that same day.)
    if (date_from) {
      const from = new Date(date_from);
      from.setHours(0, 0, 0, 0);
      where.invoice_date = { ...where.invoice_date, gte: from };
    }
    if (date_to) {
      const to = new Date(date_to);
      to.setHours(23, 59, 59, 999);
      where.invoice_date = { ...where.invoice_date, lte: to };
    }
    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { customer: { customer_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { invoice_date: 'desc' },
        include: { customer: { select: { id: true, customer_name: true, city: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(businessId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, business_id: businessId },
      include: { customer: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async findByCustomer(businessId: string, customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { business_id: businessId, customer_id: customerId };
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip, take: limit, orderBy: { invoice_date: 'desc' } }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(businessId: string, dto: CreateInvoiceDto) {
    return this.prisma.invoice.create({
      data: {
        ...dto,
        business_id: businessId,
        invoice_date: new Date(dto.invoice_date),
        status: (dto.status as any) ?? 'PENDING',
      },
    });
  }

  async update(businessId: string, id: string, data: Partial<CreateInvoiceDto>) {
    await this.findById(businessId, id);
    return this.prisma.invoice.update({ where: { id }, data: data as any });
  }
}
