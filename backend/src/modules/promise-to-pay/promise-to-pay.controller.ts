import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { PromiseToPayService, CreatePTPDto, UpdatePTPDto } from './promise-to-pay.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('promise-to-pay')
@UseGuards(JwtAuthGuard)
export class PromiseToPayController {
  constructor(private ptpService: PromiseToPayService) {}

  @Get()
  findAll(@BusinessId() businessId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.ptpService.findAll(businessId, page, limit);
  }

  @Get('customer/:customerId')
  findByCustomer(@BusinessId() businessId: string, @Param('customerId') customerId: string) {
    return this.ptpService.findByCustomer(businessId, customerId);
  }

  @Post()
  create(@BusinessId() businessId: string, @Body() dto: CreatePTPDto) {
    return this.ptpService.create(businessId, dto);
  }

  @Patch(':id')
  update(@BusinessId() businessId: string, @Param('id') id: string, @Body() dto: UpdatePTPDto) {
    return this.ptpService.update(businessId, id, dto);
  }
}
