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

  // Segment overview (also feeds the Escalation card count on the UI)
  @Get('overview')
  getOverview(@BusinessId() businessId: string) {
    return this.reportsService.getSegmentOverview(businessId);
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
      breakdown: type === 'negative' ? report.summary.negative_breakdown : undefined,
    });

    this.sendPdf(res, buffer, `${type}-recovery-report`);
  }

  // Downloadable PDF: every party currently in the Escalation range
  @Get('escalation/pdf')
  async downloadEscalationPdf(@BusinessId() businessId: string, @Res() res: Response) {
    const [entries, business] = await Promise.all([
      this.reportsService.getEscalationReport(businessId),
      this.prisma.business.findUnique({ where: { id: businessId }, select: { name: true } }),
    ]);

    const buffer = await this.pdfService.generateEscalation({
      businessName: business?.name ?? 'PraecisAI',
      entries,
    });
    this.sendPdf(res, buffer, 'escalation-parties-report');
  }

  // Downloadable PDF: all segments in detail for the owner
  @Get('overview/pdf')
  async downloadOverviewPdf(@BusinessId() businessId: string, @Res() res: Response) {
    const [data, business] = await Promise.all([
      this.reportsService.getSegmentOverview(businessId),
      this.prisma.business.findUnique({ where: { id: businessId }, select: { name: true } }),
    ]);

    const buffer = await this.pdfService.generateOverview({
      businessName: business?.name ?? 'PraecisAI',
      data,
    });
    this.sendPdf(res, buffer, 'segment-overview-report');
  }

  private sendPdf(res: Response, buffer: Buffer, baseName: string) {
    const today = new Date();
    const stamp = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${baseName}_${stamp}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
