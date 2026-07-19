import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@BusinessId() businessId: string) {
    return this.dashboardService.getStats(businessId);
  }

  @Get('activity')
  getActivity(
    @BusinessId() businessId: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getRecentActivity(businessId, limit);
  }

  @Get('credits')
  getCredits(@BusinessId() businessId: string) {
    return this.dashboardService.getCredits(businessId);
  }
}
