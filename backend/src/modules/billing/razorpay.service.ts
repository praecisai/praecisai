import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SUBSCRIPTION_PLAN_PAISE_INCL_GST } from './billing-math.util';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

/**
 * Thin Razorpay REST client (fetch + basic auth: no SDK dependency).
 *
 * MOCK MODE: when RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are absent, or
 * RAZORPAY_MOCK=true, every call returns deterministic fake objects
 * (sub_mock_*, order_mock_*). This lets the whole billing flow: checkout,
 * webhooks (via the dev simulate endpoints), invoices, admin: be exercised
 * locally before the Razorpay KYC/account exists.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private cachedPlanId: string | null = null;

  constructor(private config: ConfigService) {}

  get isMock(): boolean {
    if (this.config.get<string>('RAZORPAY_MOCK') === 'true') return true;
    return !this.keyId || !this.keySecret;
  }

  get keyId(): string | undefined {
    return this.config.get<string>('RAZORPAY_KEY_ID');
  }

  private get keySecret(): string | undefined {
    return this.config.get<string>('RAZORPAY_KEY_SECRET');
  }

  private get webhookSecret(): string | undefined {
    return this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
  }

  private async request<T = any>(method: string, path: string, body?: object): Promise<T> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const res = await fetch(`${RAZORPAY_API}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      // Razorpay error bodies are JSON but never contain our secrets
      this.logger.error(`Razorpay ${method} ${path} failed (${res.status}): ${text}`);
      throw new InternalServerErrorException('Payment gateway request failed');
    }
    return JSON.parse(text) as T;
  }

  /**
   * The ₹5,900/month plan (₹5,000 + 18% GST). Uses RAZORPAY_PLAN_ID when set;
   * otherwise creates the plan once and caches the id for this process.
   */
  async ensurePlanId(): Promise<string> {
    const fromEnv = this.config.get<string>('RAZORPAY_PLAN_ID');
    if (fromEnv) return fromEnv;
    if (this.cachedPlanId) return this.cachedPlanId;
    if (this.isMock) {
      this.cachedPlanId = 'plan_mock_praecis_5900';
      return this.cachedPlanId;
    }
    const plan = await this.request<{ id: string }>('POST', '/plans', {
      period: 'monthly',
      interval: 1,
      item: {
        name: 'PraecisAI Monthly Subscription',
        amount: SUBSCRIPTION_PLAN_PAISE_INCL_GST,
        currency: 'INR',
        description: 'Rs.5,000 per month + 18% GST',
      },
    });
    this.cachedPlanId = plan.id;
    this.logger.warn(
      `Created Razorpay plan ${plan.id}: add RAZORPAY_PLAN_ID=${plan.id} to .env to avoid re-creating`,
    );
    return plan.id;
  }

  /**
   * Subscription anchored to the 1st with the onboarding amount charged
   * upfront as an addon on the authorization payment.
   */
  async createSubscription(opts: {
    planId: string;
    startAt: Date;
    upfrontPaise: number;
    upfrontLabel: string;
    notes: Record<string, string>;
  }): Promise<{ id: string; status: string; short_url?: string }> {
    if (this.isMock) {
      const id = `sub_mock_${crypto.randomBytes(8).toString('hex')}`;
      this.logger.log(`[MOCK] Created subscription ${id} (start ${opts.startAt.toISOString()})`);
      return { id, status: 'created' };
    }
    return this.request('POST', '/subscriptions', {
      plan_id: opts.planId,
      total_count: 120, // 10 years of monthly cycles
      quantity: 1,
      start_at: Math.floor(opts.startAt.getTime() / 1000),
      customer_notify: 1,
      addons: [
        {
          item: {
            name: opts.upfrontLabel,
            amount: opts.upfrontPaise,
            currency: 'INR',
          },
        },
      ],
      notes: opts.notes,
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Cancelled subscription ${subscriptionId}`);
      return;
    }
    await this.request('POST', `/subscriptions/${subscriptionId}/cancel`, {
      cancel_at_cycle_end: 0,
    });
  }

  /** Webhook HMAC verification on the RAW body. Never trust parsed JSON. */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
    const secret = this.webhookSecret;
    if (!secret || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /** Checkout-callback signature: HMAC(payment_id + '|' + subscription_id, key_secret). */
  verifySubscriptionPaymentSignature(opts: {
    paymentId: string;
    subscriptionId: string;
    signature: string;
  }): boolean {
    if (this.isMock) return true;
    const secret = this.keySecret;
    if (!secret) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${opts.paymentId}|${opts.subscriptionId}`)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(opts.signature));
    } catch {
      return false;
    }
  }
}
