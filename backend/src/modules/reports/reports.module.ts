import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { RecoveryReportPdfService } from './recovery-report-pdf.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, RecoveryReportPdfService],
  exports: [ReportsService],
})
export class ReportsModule {}
