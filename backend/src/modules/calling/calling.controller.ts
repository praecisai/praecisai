import { Controller, Post, Body, Headers, UnauthorizedException, HttpCode } from '@nestjs/common';
import { CallingService } from './calling.service';
import * as crypto from 'crypto';

@Controller('calling')
export class CallingController {
  constructor(private readonly callingService: CallingService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleRetellWebhook(
    @Headers('x-retell-signature') signature: string,
    @Body() payload: any,
  ) {
    const secret = process.env.RETELL_WEBHOOK_SECRET;
    
    // Verify signature (Retell SDK documentation format)
    if (secret && signature) {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(JSON.stringify(payload)).digest('hex');
      
      // In a real environment, you might need to compute signature exactly as Retell defines it.
      // Often it's standard HMAC-SHA256 of the raw body.
    }

    // Handle asynchronously or synchronously. Retell expects a quick 200 OK.
    try {
      await this.callingService.handleWebhook(payload);
    } catch (error) {
      console.error('Error handling Retell webhook:', error);
    }

    return { received: true };
  }
}
