import { Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import { OutstandingService, OutstandingFiltersDto } from './outstanding.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('outstandings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OutstandingController {
  constructor(private outstandingService: OutstandingService) {}

  @Get()
  findAll(@BusinessId() businessId: string, @Query() filters: OutstandingFiltersDto) {
    return this.outstandingService.findAll(businessId, filters);
  }

  @Get('aging-breakdown')
  getAgingBreakdown(@BusinessId() businessId: string) {
    return this.outstandingService.getAgingBreakdown(businessId);
  }

  @Get('segment-breakdown')
  getSegmentBreakdown(@BusinessId() businessId: string) {
    return this.outstandingService.getSegmentBreakdown(businessId);
  }

  @Get('customer/:customerId')
  findByCustomer(@BusinessId() businessId: string, @Param('customerId') customerId: string) {
    return this.outstandingService.findByCustomer(businessId, customerId);
  }

  @Post('recalculate')
  @Roles('MANAGER')
  recalculateAll(@BusinessId() businessId: string) {
    return this.outstandingService.recalculateAll(businessId);
  }

  @Post('recalculate/:customerId')
  @Roles('MANAGER')
  recalculateOne(
    @BusinessId() businessId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.outstandingService.recalculateForCustomer(businessId, customerId);
  }
}
