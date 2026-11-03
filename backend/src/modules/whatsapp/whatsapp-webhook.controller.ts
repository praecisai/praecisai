import { Controller, Post, Body, Query, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { WhatsappService } from './whatsapp.service';

/**
 * Public endpoint for AiSensy inbound-message webhooks. No JWT: external
 * service. Protected by a shared secret in the URL (?token=...) matched
 * against AISENSY_INBOUND_TOKEN. Always answers 200 fast so AiSensy does not
 * retry, then processes asynchronously.
 *
 * Each tenant's AiSensy project should add &business=<businessId> to the URL
 * so a reply is only matched within that business (one project = one tenant's
 * WhatsApp number). Without it, matching falls back to all businesses.
 */
@Controller('whatsapp')
export class WhatsappWebhookController {
  constructor(private whatsappService: WhatsappService) {}

  @Post('inbound')
  @HttpCode(200)
  async inbound(
    @Query('token') token: string,
    @Query('business') businessId: string | undefined,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    res.status(200).json({ received: true });

    const expected = process.env.AISENSY_INBOUND_TOKEN;
    if (expected && token !== expected) {
      // Silently ignore unauthenticated calls (do not reveal anything)
      return;
    }

    try {
      await this.whatsappService.handleInbound(payload, businessId || undefined);
    } catch (err) {
      // Never throw back to AiSensy: already responded 200
      console.error('Inbound WhatsApp handling error:', err);
    }
  }
}
