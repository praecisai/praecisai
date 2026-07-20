import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TenantKeysModule } from '../billing/tenant-keys.module';
import { OutstandingModule } from '../outstanding/outstanding.module';

@Module({
  imports: [TenantKeysModule, OutstandingModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
