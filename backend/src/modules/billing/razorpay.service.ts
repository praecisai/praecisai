import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BillingPlan, SUBSCRIPTION_PLAN_PAISE_INCL_GST, SUBSCRIPTION_YEARLY_PAISE } from './billing-math.util';

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
  private cachedPlanIds: Partial<Record<BillingPlan, string>> = {};

  constructor(private config: ConfigService) {}

  /** Boot-time visibility of which mode the gateway is running in. */
  onModuleInit() {
    if (this.isMock) {
      this.logger.warn('Razorpay running in MOCK mode (no keys / RAZORPAY_MOCK=true)');
    } else {
      const live = this.keyId?.startsWith('rzp_live');
      this.logger.log(
        `Razorpay running in ${live ? 'LIVE' : 'TEST'} mode (key ${this.keyId?.slice(0, 12)}...)`,
      );
      if (!this.config.get<string>('RAZORPAY_WEBHOOK_SECRET')) {
        this.logger.warn('RAZORPAY_WEBHOOK_SECRET missing: webhooks will be rejected');
      }
    }
  }

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
   * The Razorpay plan for a billing plan (no GST):
   * - MONTHLY: ₹5,000 every month. Uses RAZORPAY_PLAN_ID when set.
   * - YEARLY: ₹40,000 every year. Uses RAZORPAY_YEARLY_PLAN_ID when set.
   * Otherwise the plan is created once and its id cached for this process.
   *
   * IMPORTANT: a Razorpay plan's amount is fixed at creation and cannot be
   * edited. RAZORPAY_PLAN_ID must therefore point at a ₹5,000 monthly plan and
   * RAZORPAY_YEARLY_PLAN_ID at a ₹40,000 yearly plan.
   */
  async ensurePlanId(billingPlan: BillingPlan = 'MONTHLY'): Promise<string> {
    const yearly = billingPlan === 'YEARLY';
    const fromEnv = this.config.get<string>(yearly ? 'RAZORPAY_YEARLY_PLAN_ID' : 'RAZORPAY_PLAN_ID');
    if (fromEnv) return fromEnv;
    const cached = this.cachedPlanIds[billingPlan];
    if (cached) return cached;
    if (this.isMock) {
      const id = yearly ? 'plan_mock_praecis_40000_yearly' : 'plan_mock_praecis_5000';
      this.cachedPlanIds[billingPlan] = id;
      return id;
    }
    const plan = await this.request<{ id: string }>('POST', '/plans', {
      period: yearly ? 'yearly' : 'monthly',
      interval: 1,
      item: {
        name: yearly ? 'PraecisAI Yearly Subscription' : 'PraecisAI Monthly Subscription',
        amount: yearly ? SUBSCRIPTION_YEARLY_PAISE : SUBSCRIPTION_PLAN_PAISE_INCL_GST,
        currency: 'INR',
        description: yearly ? 'Rs.40,000 per year' : 'Rs.5,000 per month',
      },
    });
    this.cachedPlanIds[billingPlan] = plan.id;
    const envName = yearly ? 'RAZORPAY_YEARLY_PLAN_ID' : 'RAZORPAY_PLAN_ID';
    this.logger.warn(
      `Created Razorpay plan ${plan.id}: add ${envName}=${plan.id} to .env to avoid re-creating`,
    );
    return plan.id;
  }

  /**
   * Subscription whose first period is charged upfront as an addon on the
   * authorization payment; recurring debits start at `startAt`.
   */
  async createSubscription(opts: {
    planId: string;
    startAt: Date;
    upfrontPaise: number;
    upfrontLabel: string;
    notes: Record<string, string>;
    /** Number of billing cycles: 120 monthly or 10 yearly = 10 years */
    totalCount?: number;
  }): Promise<{ id: string; status: string; short_url?: string }> {
    if (this.isMock) {
      const id = `sub_mock_${crypto.randomBytes(8).toString('hex')}`;
      this.logger.log(`[MOCK] Created subscription ${id} (start ${opts.startAt.toISOString()})`);
      return { id, status: 'created' };
    }
    return this.request('POST', '/subscriptions', {
      plan_id: opts.planId,
      total_count: opts.totalCount ?? 120, // 10 years of monthly cycles by default
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

  /** One-time order (used for the 10-day trial). */
  async createOrder(opts: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<{ id: string; status: string }> {
    if (this.isMock) {
      const id = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      this.logger.log(`[MOCK] Created order ${id} for ${opts.amountPaise} paise`);
      return { id, status: 'created' };
    }
    return this.request('POST', '/orders', {
      amount: opts.amountPaise,
      currency: 'INR',
      receipt: opts.receipt,
      notes: opts.notes,
    });
  }

  /** Checkout-callback signature for ORDER payments: HMAC(order_id|payment_id). */
  verifyOrderPaymentSignature(opts: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    if (this.isMock) return true;
    const secret = this.keySecret;
    if (!secret) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${opts.orderId}|${opts.paymentId}`)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(opts.signature));
    } catch {
      return false;
    }
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
