import { Controller, Post, Body, Headers, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import { CallingService } from './calling.service';
import * as crypto from 'crypto';

@Controller('calling')
export class CallingController {
  constructor(private readonly callingService: CallingService) {}

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
