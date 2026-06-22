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
  async handleRetellWebhook(
    @Headers('x-retell-signature') signature: string,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    // Return 200 OK immediately to prevent Retell timeout
    res.status(200).json({ received: true });

    const secret = process.env.RETELL_WEBHOOK_SECRET;
    
    // Verify signature (Retell SDK documentation format)
    if (secret && signature) {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(JSON.stringify(payload)).digest('hex');
    }

    // Process asynchronously after responding
    try {
      await this.callingService.handleWebhook(payload);
    } catch (error) {
      console.error('Error handling Retell webhook:', error);
    }
  }
}
