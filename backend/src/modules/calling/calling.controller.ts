import { Controller, Post, Body, Headers, HttpCode, Res, Param, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CallingService } from './calling.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailAllowlistGuard } from '../../common/guards/email-allowlist.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';
import * as crypto from 'crypto';

@Controller('calling')
export class CallingController {
  constructor(private readonly callingService: CallingService) {}

  // Queue an AI recovery call to a real customer (dashboard action)
  @Post('call-customer/:customerId')
  @UseGuards(JwtAuthGuard, EmailAllowlistGuard)
  callCustomer(
    @BusinessId() businessId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.callingService.queueCustomerCall(businessId, customerId);
  }

  // Bulk: queue calls to every eligible customer in a segment
  @Post('call-segment')
  @UseGuards(JwtAuthGuard, EmailAllowlistGuard)
  callSegment(@BusinessId() businessId: string, @Body() body: { segment: string }) {
    return this.callingService.queueSegmentCalls(businessId, body.segment);
  }

  // RETELL DASHBOARD ACTION REQUIRED:
  // Set webhook URL to: https://praecisai-production.up.railway.app/api/v1/calling/webhook
  // Enable events: call_started, call_ended, call_analyzed
  // Copy webhook secret to RETELL_WEBHOOK_SECRET env var in Railway
  @Post('webhook')
  async handleBolnaWebhook(
    @Headers('x-bolna-signature') signature: string,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    res.status(200).json({ received: true });

    if (process.env.BOLNA_WEBHOOK_SECRET && signature) {
      const hmac = crypto.createHmac('sha256', process.env.BOLNA_WEBHOOK_SECRET);
      hmac.update(JSON.stringify(payload)).digest('hex');
    }

    try {
      await this.callingService.handleWebhook(payload);
    } catch (error) {
      console.error('Error handling Bolna webhook:', error);
    }
  }
}
