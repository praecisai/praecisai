import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { InvoiceService, InvoiceFiltersDto, CreateInvoiceDto } from './invoice.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  @Get()
  findAll(@BusinessId() businessId: string, @Query() filters: InvoiceFiltersDto) {
    return this.invoiceService.findAll(businessId, filters);
  }

  @Get('customer/:customerId')
  findByCustomer(
    @BusinessId() businessId: string,
    @Param('customerId') customerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoiceService.findByCustomer(businessId, customerId, page, limit);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.invoiceService.findById(businessId, id);
  }

  @Post()
  @Roles('MANAGER')
  create(@BusinessId() businessId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(businessId, dto);
  }

  @Patch(':id')
  @Roles('MANAGER')
  update(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateInvoiceDto>,
  ) {
    return this.invoiceService.update(businessId, id, dto);
  }
}
