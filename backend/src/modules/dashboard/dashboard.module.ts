import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TenantKeysModule } from '../billing/tenant-keys.module';

@Module({
  imports: [TenantKeysModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
