import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { BillingService } from './billing.service';

/**
 * Razorpay webhook receiver.
 *
 * Security: HMAC-SHA256 signature verified against the RAW request body
 * (main.ts boots Nest with rawBody: true). Idempotency: the x-razorpay-event-id
 * header is recorded in razorpay_events; a replayed delivery acks immediately
 * without re-processing.
 */
@Controller('billing/razorpay')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private billing: BillingService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event-id') eventId: string,
  ) {
    const raw = req.rawBody;
    if (!raw) throw new BadRequestException('Missing raw body');
    if (!this.razorpay.verifyWebhookSignature(raw, signature)) {
      this.logger.warn('Rejected Razorpay webhook: bad signature');
      throw new BadRequestException('Invalid signature');
    }

    const payload = JSON.parse(raw.toString('utf8'));
    const eventType: string = payload?.event ?? 'unknown';
    const dedupeId = eventId || `${eventType}:${payload?.created_at ?? Date.now()}`;

    // Idempotency: first writer wins, replays ack silently
    try {
      await this.prisma.razorpayEvent.create({
        data: { event_id: dedupeId, event_type: eventType },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.log(`Duplicate webhook ${dedupeId} (${eventType}): acked without processing`);
        return { status: 'ok', duplicate: true };
      }
      throw err;
    }

    this.logger.log(`Razorpay webhook: ${eventType} (${dedupeId})`);

    try {
      switch (eventType) {
        case 'payment.captured': {
          const payment = payload?.payload?.payment?.entity;
          const subscriptionId =
            payment?.subscription_id ?? payload?.payload?.subscription?.entity?.id;
          if (payment?.id && subscriptionId) {
            await this.billing.handleOnboardingCaptured({
              razorpaySubscriptionId: subscriptionId,
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id,
              mandateType: payment.method,
            });
          }
          break;
        }
        case 'subscription.charged': {
          const sub = payload?.payload?.subscription?.entity;
          const payment = payload?.payload?.payment?.entity;
          if (sub?.id && payment?.id) {
            await this.billing.handleSubscriptionCharged({
              razorpaySubscriptionId: sub.id,
              razorpayPaymentId: payment.id,
              chargeAt: payment.created_at ? new Date(payment.created_at * 1000) : null,
              amountPaise: typeof payment.amount === 'number' ? payment.amount : undefined,
            });
          }
          break;
        }
        case 'subscription.halted':
        case 'subscription.pending': {
          const sub = payload?.payload?.subscription?.entity;
          if (sub?.id) {
            await this.billing.handleSubscriptionTrouble(
              sub.id,
              eventType === 'subscription.halted' ? 'halted' : 'pending',
            );
          }
          break;
        }
        case 'subscription.activated':
        case 'subscription.authenticated': {
          const sub = payload?.payload?.subscription?.entity;
          if (sub?.id) {
            await this.prisma.billingSubscription.updateMany({
              where: { razorpay_subscription_id: sub.id },
              data: {
                status: 'ACTIVE',
                ...(sub.payment_method ? { mandate_type: sub.payment_method } : {}),
                ...(sub.charge_at ? { next_debit_date: new Date(sub.charge_at * 1000) } : {}),
              },
            });
          }
          break;
        }
        case 'subscription.cancelled': {
          const sub = payload?.payload?.subscription?.entity;
          if (sub?.id) {
            await this.prisma.billingSubscription.updateMany({
              where: { razorpay_subscription_id: sub.id },
              data: { status: 'CANCELLED' },
            });
          }
          break;
        }
        default:
          this.logger.log(`Unhandled Razorpay event type: ${eventType}`);
      }
    } catch (err: any) {
      // The event row stays: log loudly, ack 200 so Razorpay doesn't hammer us,
      // and rely on admin notifications/monitoring for recovery.
      this.logger.error(`Webhook ${eventType} processing failed: ${err?.message}`, err?.stack);
    }

    return { status: 'ok' };
  }
}
