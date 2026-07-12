import { Controller, Get, Post, Body, UseGuards, Query, Param } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailAllowlistGuard } from '../../common/guards/email-allowlist.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('logs')
  getLogs(@BusinessId() businessId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.whatsappService.getLogs(businessId, page, limit);
  }

  @Post('logs')
  createLog(@BusinessId() businessId: string, @Body() dto: any) {
    return this.whatsappService.createLog(businessId, dto);
  }

  // Send the outstanding-statement PDF to a customer via AiSensy
  @Post('send-statement/:customerId')
  @UseGuards(EmailAllowlistGuard)
  sendStatement(@BusinessId() businessId: string, @Param('customerId') customerId: string) {
    return this.whatsappService.sendStatementToCustomer(businessId, customerId);
  }

  // Bulk: statement PDFs to every eligible customer in a segment
  @Post('send-segment')
  @UseGuards(EmailAllowlistGuard)
  sendSegment(@BusinessId() businessId: string, @Body() body: { segment: string; vipOnly?: boolean }) {
    return this.whatsappService.sendSegmentStatements(businessId, body.segment, body.vipOnly === true);
  }
}
