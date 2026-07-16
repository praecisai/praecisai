import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomerService, CreateCustomerDto, UpdateCustomerDto, CustomerFiltersDto } from './customer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @Get()
  findAll(@BusinessId() businessId: string, @Query() filters: CustomerFiltersDto) {
    return this.customerService.findAll(businessId, filters);
  }

  @Get('cities')
  getCities(@BusinessId() businessId: string) {
    return this.customerService.getCities(businessId);
  }

  @Get('agents')
  getAgents(@BusinessId() businessId: string) {
    return this.customerService.getAgents(businessId);
  }

  // Excel with PARTY + VIP (Yes/No) columns — auto-stars/un-stars customers
  @Post('vip-import')
  @Roles('MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  importVip(@BusinessId() businessId: string, @UploadedFile() file: Express.Multer.File) {
    return this.customerService.importVipExcel(businessId, file);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.customerService.findById(businessId, id);
  }

  @Post()
  @Roles('MANAGER')
  create(@BusinessId() businessId: string, @Body() dto: CreateCustomerDto) {
    return this.customerService.create(businessId, dto);
  }

  @Patch(':id')
  @Roles('MANAGER')
  update(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(businessId, id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  remove(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.customerService.remove(businessId, id);
  }
}
