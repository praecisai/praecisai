import { Controller, Get, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { RecoveryReportPdfService } from './recovery-report-pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfService: RecoveryReportPdfService,
    private readonly prisma: PrismaService,
  ) {}

  // Positive + negative lists with summary counts (dashboard view)
  @Get('recovery')
  getRecovery(@BusinessId() businessId: string) {
    return this.reportsService.getRecoveryReport(businessId);
  }

  // Downloadable PDF: ?type=positive|negative
  @Get('recovery/pdf')
  async downloadPdf(
    @BusinessId() businessId: string,
    @Query('type') type: string,
    @Res() res: Response,
  ) {
    if (type !== 'positive' && type !== 'negative') {
      throw new BadRequestException('type must be "positive" or "negative"');
    }

    const [report, business] = await Promise.all([
      this.reportsService.getRecoveryReport(businessId),
      this.prisma.business.findUnique({ where: { id: businessId }, select: { name: true } }),
    ]);

    const buffer = await this.pdfService.generate({
      type,
      businessName: business?.name ?? 'PraecisAI',
      entries: type === 'positive' ? report.positive : report.negative,
    });

    const today = new Date();
    const stamp = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${type}-recovery-report_${stamp}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
