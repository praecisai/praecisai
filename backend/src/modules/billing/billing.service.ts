import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { BillingNotificationService, BOLNA_TOPUP_URL, AISENSY_DASHBOARD_URL } from './billing-notification.service';
import { BillingInvoiceService } from './billing-invoice.service';
import {
  computeOnboardingQuote,
  firstDebitDate,
  BillingAnchorMode,
  isAllowedCouponPercent,
  SUBSCRIPTION_MONTHLY_PAISE,
  monthlySubscriptionGstPaise,
  SUBSCRIPTION_PLAN_PAISE_INCL_GST,
} from './billing-math.util';
import { Coupon, BillingPayment, OnboardingStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private razorpay: RazorpayService,
    private notifications: BillingNotificationService,
    private invoices: BillingInvoiceService,
  ) {}

  get anchorMode(): BillingAnchorMode {
    const raw = this.config.get<string>('BILLING_ANCHOR_MODE');
    return raw === 'FIRST_AFTER_FULL_MONTH' ? 'FIRST_AFTER_FULL_MONTH' : 'IMMEDIATE_NEXT_FIRST';
  }

  // ─── Coupons ────────────────────────────────────────────────────────────────

  /** Throws with a user-readable message when the coupon can't be used. */
  async validateCoupon(code: string, businessId: string): Promise<Coupon> {
    if (!code?.trim()) throw new BadRequestException('A coupon code is required at checkout');
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!coupon) throw new BadRequestException('Invalid coupon code');
    if (!coupon.active) throw new BadRequestException('This coupon has been deactivated');
    if (coupon.expires_at && coupon.expires_at < new Date())
      throw new BadRequestException('This coupon has expired');
    if (coupon.used_count >= coupon.max_uses)
      throw new BadRequestException('This coupon has already been used');
    if (coupon.used_by_tenant_id && coupon.used_by_tenant_id !== businessId)
      throw new BadRequestException('This coupon belongs to another account');
    if (!isAllowedCouponPercent(coupon.percent))
      throw new BadRequestException('Coupon has an invalid percent');
    return coupon;
  }

  /** Preview: coupon + full server-side quote (never trust client math). */
  async quoteOnboarding(code: string, businessId: string) {
    const coupon = await this.validateCoupon(code, businessId);
    const quote = computeOnboardingQuote(coupon.percent);
    return { coupon: { code: coupon.code, percent: coupon.percent }, quote };
  }

  // ─── Onboarding checkout ────────────────────────────────────────────────────

  async createOnboardingCheckout(businessId: string, couponCode: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');
    if (business.onboarding_status === OnboardingStatus.PAID || business.onboarding_status === OnboardingStatus.ACTIVE) {
      throw new BadRequestException('Onboarding payment has already been completed');
    }

    const coupon = await this.validateCoupon(couponCode, businessId);
    const quote = computeOnboardingQuote(coupon.percent);
    const startAt = firstDebitDate(new Date(), this.anchorMode);

    const planId = await this.razorpay.ensurePlanId();
    const subscription = await this.razorpay.createSubscription({
      planId,
      startAt,
      upfrontPaise: quote.totalAmount,
      upfrontLabel: 'PraecisAI onboarding (setup + first month) incl. 18% GST',
      notes: {
        praecis_business_id: businessId,
        praecis_type: 'onboarding',
        coupon: coupon.code,
      },
    });

    // Local records: subscription (PENDING until mandate authorized) + payment (CREATED)
    await this.prisma.billingSubscription.upsert({
      where: { business_id: businessId },
      create: {
        business_id: businessId,
        razorpay_subscription_id: subscription.id,
        plan_amount: SUBSCRIPTION_MONTHLY_PAISE,
        status: 'PENDING',
        next_debit_date: startAt,
      },
      update: {
        razorpay_subscription_id: subscription.id,
        status: 'PENDING',
        next_debit_date: startAt,
      },
    });

    const payment = await this.prisma.billingPayment.create({
      data: {
        business_id: businessId,
        type: 'ONBOARDING',
        razorpay_subscription_id: subscription.id,
        base_amount: quote.baseAmount,
        discount_amount: quote.discountAmount,
        setup_component: quote.setupComponent,
        subscription_component: quote.subscriptionComponent,
        gst_amount: quote.gstAmount,
        total_amount: quote.totalAmount,
        status: 'CREATED',
        coupon_id: coupon.id,
      },
    });

    return {
      mock: this.razorpay.isMock,
      razorpay_key_id: this.razorpay.keyId ?? null,
      subscription_id: subscription.id,
      payment_record_id: payment.id,
      first_debit_date: startAt,
      quote,
      coupon: { code: coupon.code, percent: coupon.percent },
    };
  }

  // ─── Payment success paths (shared by webhook + dev simulator) ─────────────

  /** payment.captured for the onboarding/auth payment. Idempotent. */
  async handleOnboardingCaptured(opts: {
    razorpaySubscriptionId: string;
    razorpayPaymentId: string;
    razorpayOrderId?: string;
    mandateType?: string;
  }) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: {
        razorpay_subscription_id: opts.razorpaySubscriptionId,
        type: 'ONBOARDING',
        status: 'CREATED',
      },
      orderBy: { created_at: 'desc' },
    });
    if (!payment) {
      // Either already processed (idempotent replay) or unknown subscription
      const already = await this.prisma.billingPayment.findFirst({
        where: { razorpay_payment_id: opts.razorpayPaymentId },
      });
      if (already) return already;
      this.logger.warn(
        `payment.captured for unknown onboarding subscription ${opts.razorpaySubscriptionId}`,
      );
      return null;
    }

    const paid = await this.prisma.billingPayment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paid_at: new Date(),
        razorpay_payment_id: opts.razorpayPaymentId,
        razorpay_order_id: opts.razorpayOrderId,
      },
    });

    // Burn the coupon on actual payment (not on abandoned checkouts)
    if (payment.coupon_id) {
      await this.prisma.coupon.update({
        where: { id: payment.coupon_id },
        data: { used_count: { increment: 1 }, used_by_tenant_id: payment.business_id },
      });
    }

    await this.prisma.business.update({
      where: { id: payment.business_id },
      data: { onboarding_status: OnboardingStatus.PAID },
    });

    await this.prisma.billingSubscription.updateMany({
      where: { business_id: payment.business_id },
      data: { status: 'ACTIVE', ...(opts.mandateType ? { mandate_type: opts.mandateType } : {}) },
    });

    await this.invoices.createForPayment(paid);
    this.logger.log(`Onboarding payment captured for business ${payment.business_id}`);
    return paid;
  }

  /** subscription.charged: monthly debit. Idempotent via razorpay_payment_id. */
  async handleSubscriptionCharged(opts: {
    razorpaySubscriptionId: string;
    razorpayPaymentId: string;
    chargeAt?: Date | null;
    amountPaise?: number;
  }) {
    const existing = await this.prisma.billingPayment.findFirst({
      where: { razorpay_payment_id: opts.razorpayPaymentId },
    });
    if (existing) return existing;

    const sub = await this.prisma.billingSubscription.findFirst({
      where: { razorpay_subscription_id: opts.razorpaySubscriptionId },
    });
    if (!sub) {
      this.logger.warn(`subscription.charged for unknown subscription ${opts.razorpaySubscriptionId}`);
      return null;
    }

    const gst = monthlySubscriptionGstPaise();
    const total = opts.amountPaise ?? SUBSCRIPTION_PLAN_PAISE_INCL_GST;
    const payment = await this.prisma.billingPayment.create({
      data: {
        business_id: sub.business_id,
        type: 'SUBSCRIPTION',
        razorpay_subscription_id: opts.razorpaySubscriptionId,
        razorpay_payment_id: opts.razorpayPaymentId,
        base_amount: SUBSCRIPTION_MONTHLY_PAISE,
        subscription_component: SUBSCRIPTION_MONTHLY_PAISE,
        gst_amount: gst,
        total_amount: total,
        status: 'PAID',
        paid_at: opts.chargeAt ?? new Date(),
      },
    });

    // Extend validity: next debit is the following 1st
    const nextDebit = firstDebitDate(payment.paid_at ?? new Date(), 'IMMEDIATE_NEXT_FIRST');
    await this.prisma.billingSubscription.update({
      where: { id: sub.id },
      data: { status: 'ACTIVE', next_debit_date: nextDebit },
    });
    await this.prisma.business.update({
      where: { id: sub.business_id },
      data: { onboarding_status: OnboardingStatus.ACTIVE },
    });

    // A successful charge heals any mandate failure
    await this.notifications.resolveOpen(sub.business_id, 'MANDATE_FAILED');
    await this.notifications.create(
      sub.business_id,
      'DEBIT_SUCCESS',
      `Monthly subscription of Rs.5,900 (Rs.5,000 + GST) debited successfully. Next debit: ${nextDebit.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
    );

    await this.invoices.createForPayment(payment);
    this.logger.log(`Subscription charged for business ${sub.business_id}`);
    return payment;
  }

  /** subscription.halted / subscription.pending: mandate trouble. */
  async handleSubscriptionTrouble(razorpaySubscriptionId: string, kind: 'halted' | 'pending') {
    const sub = await this.prisma.billingSubscription.findFirst({
      where: { razorpay_subscription_id: razorpaySubscriptionId },
    });
    if (!sub) return;
    await this.prisma.billingSubscription.update({
      where: { id: sub.id },
      data: { status: 'HALTED' },
    });
    await this.notifications.createOnce(
      sub.business_id,
      'MANDATE_FAILED',
      kind === 'halted'
        ? 'Your monthly auto-debit mandate has been halted after repeated failures. Campaigns are paused until the payment issue is resolved: please update your payment method.'
        : 'This month\'s auto-debit could not be completed and will be retried. Campaigns are paused until the payment goes through.',
    );
    const business = await this.prisma.business.findUnique({
      where: { id: sub.business_id },
      select: { billing_email: true, name: true },
    });
    await this.notifications.emailNudge(
      business?.billing_email,
      'PraecisAI: action needed on your subscription payment',
      `Hello ${business?.name ?? ''},\n\nYour PraecisAI monthly auto-debit failed and your recovery campaigns are paused until it is resolved. Please update your payment method or retry the mandate.\n\nPraecisAI Billing`,
    );
    this.logger.warn(`Subscription ${kind} for business ${sub.business_id}: campaigns paused`);
  }

  // ─── Client-facing reads ────────────────────────────────────────────────────

  async summary(businessId: string) {
    const [business, subscription, payments, invoiceList, banners] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          onboarding_status: true,
          billing_email: true,
          gstin: true,
          low_balance_threshold_usd: true,
        },
      }),
      this.prisma.billingSubscription.findUnique({ where: { business_id: businessId } }),
      this.prisma.billingPayment.findMany({
        where: { business_id: businessId },
        orderBy: { created_at: 'desc' },
        include: { coupon: { select: { code: true, percent: true } } },
      }),
      this.invoices.listForTenant(businessId),
      this.notifications.openBanners(businessId),
    ]);

    const onboardingPayment = payments.find((p) => p.type === 'ONBOARDING' && p.status === 'PAID') ?? null;

    return {
      onboarding_status: business?.onboarding_status ?? 'PENDING',
      billing_email: business?.billing_email ?? null,
      gstin: business?.gstin ?? null,
      subscription: subscription
        ? {
            status: subscription.status,
            next_debit_date: subscription.next_debit_date,
            plan_amount: subscription.plan_amount,
            plan_amount_incl_gst: SUBSCRIPTION_PLAN_PAISE_INCL_GST,
            mandate_type: subscription.mandate_type,
          }
        : null,
      onboarding_payment: onboardingPayment,
      payments,
      invoices: invoiceList,
      banners,
    };
  }

  /** Calendar-month usage: Praecis fees and platform spend kept separate. */
  async monthlyUsage(businessId: string, monthStr?: string) {
    const now = new Date();
    let year: number;
    let monthIdx: number; // 0-based
    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
      year = parseInt(monthStr.slice(0, 4), 10);
      monthIdx = parseInt(monthStr.slice(5, 7), 10) - 1;
    } else {
      // Current month in IST
      const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      year = ist.getUTCFullYear();
      monthIdx = ist.getUTCMonth();
    }
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const from = new Date(Date.UTC(year, monthIdx, 1) - IST_OFFSET_MS);
    const to = new Date(Date.UTC(year, monthIdx + 1, 1) - IST_OFFSET_MS);

    const [calls, whatsappCount, snapshots, praecisPayments] = await Promise.all([
      this.prisma.callLog.findMany({
        where: { business_id: businessId, created_at: { gte: from, lt: to } },
        select: {
          id: true,
          created_at: true,
          call_status: true,
          duration_seconds: true,
          bolna_cost_usd: true,
          customer: { select: { customer_name: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 500,
      }),
      this.prisma.whatsAppLog.count({
        where: { business_id: businessId, created_at: { gte: from, lt: to } },
      }),
      this.prisma.usageSnapshot.findMany({
        where: {
          business_id: businessId,
          source: 'BOLNA',
          captured_at: { gte: from, lt: to },
        },
        orderBy: { captured_at: 'asc' },
        select: { balance: true, captured_at: true },
      }),
      this.prisma.billingPayment.findMany({
        where: {
          business_id: businessId,
          status: 'PAID',
          paid_at: { gte: from, lt: to },
        },
        orderBy: { paid_at: 'asc' },
      }),
    ]);

    const totalSeconds = calls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0);
    const bolnaSpendUsd = calls.reduce((s, c) => s + (c.bolna_cost_usd ?? 0), 0);

    return {
      month: `${year}-${String(monthIdx + 1).padStart(2, '0')}`,
      range: { from, to },
      // What the client pays PRAECIS (subscription/onboarding)
      praecis: {
        payments: praecisPayments,
        total_paise: praecisPayments.reduce((s, p) => s + p.total_amount, 0),
      },
      // What the client spends on THEIR OWN platform accounts
      platforms: {
        bolna: {
          calls_made: calls.length,
          total_minutes: Math.round((totalSeconds / 60) * 10) / 10,
          est_spend_usd: Math.round(bolnaSpendUsd * 100) / 100,
          per_call: calls.map((c) => ({
            id: c.id,
            at: c.created_at,
            customer: c.customer?.customer_name ?? '-',
            status: c.call_status,
            duration_seconds: c.duration_seconds,
            cost_usd: c.bolna_cost_usd,
          })),
          balance_history: snapshots,
        },
        aisensy: {
          messages_sent: whatsappCount,
        },
      },
    };
  }

  /** Connected-platforms card: balances, thresholds, deep links. */
  async platforms(businessId: string) {
    const [business, latestSnapshot, openLow] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          low_balance_threshold_usd: true,
          bolna_api_key: true,
          aisensy_api_key: true,
        },
      }),
      this.prisma.usageSnapshot.findFirst({
        where: { business_id: businessId, source: 'BOLNA' },
        orderBy: { captured_at: 'desc' },
      }),
      this.prisma.billingNotification.findFirst({
        where: { business_id: businessId, kind: 'BOLNA_LOW', resolved_at: null },
      }),
    ]);

    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const monthFrom = new Date(
      Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 60 * 60 * 1000,
    );
    const aisensyMessagesThisMonth = await this.prisma.whatsAppLog.count({
      where: { business_id: businessId, created_at: { gte: monthFrom } },
    });

    return {
      bolna: {
        connected: !!business?.bolna_api_key,
        balance_usd: latestSnapshot?.balance ?? null,
        captured_at: latestSnapshot?.captured_at ?? null,
        threshold_usd: business?.low_balance_threshold_usd ?? 5,
        low: !!openLow,
        topup_url: BOLNA_TOPUP_URL,
      },
      aisensy: {
        connected: !!business?.aisensy_api_key,
        messages_this_month: aisensyMessagesThisMonth,
        dashboard_url: AISENSY_DASHBOARD_URL,
      },
    };
  }

  // ─── Dev simulator (mock mode only) ────────────────────────────────────────

  private assertMock() {
    if (!this.razorpay.isMock) {
      throw new ForbiddenException('Simulator endpoints are only available in Razorpay mock mode');
    }
  }

  /** Simulates the payment.captured webhook for the pending onboarding checkout. */
  async simulateOnboardingPaid(businessId: string) {
    this.assertMock();
    const payment = await this.prisma.billingPayment.findFirst({
      where: { business_id: businessId, type: 'ONBOARDING', status: 'CREATED' },
      orderBy: { created_at: 'desc' },
    });
    if (!payment?.razorpay_subscription_id) {
      throw new BadRequestException('No pending onboarding checkout to simulate: create one first');
    }
    return this.handleOnboardingCaptured({
      razorpaySubscriptionId: payment.razorpay_subscription_id,
      razorpayPaymentId: `pay_mock_${Date.now()}`,
      mandateType: 'upi',
    });
  }

  /** Simulates a monthly subscription.charged webhook. */
  async simulateMonthlyCharge(businessId: string) {
    this.assertMock();
    const sub = await this.prisma.billingSubscription.findUnique({
      where: { business_id: businessId },
    });
    if (!sub?.razorpay_subscription_id) {
      throw new BadRequestException('No subscription on record: complete onboarding first');
    }
    return this.handleSubscriptionCharged({
      razorpaySubscriptionId: sub.razorpay_subscription_id,
      razorpayPaymentId: `pay_mock_${Date.now()}`,
      chargeAt: new Date(),
    });
  }

  /** Simulates subscription.halted (to see paused-campaign banners). */
  async simulateMandateFailure(businessId: string) {
    this.assertMock();
    const sub = await this.prisma.billingSubscription.findUnique({
      where: { business_id: businessId },
    });
    if (!sub?.razorpay_subscription_id) {
      throw new BadRequestException('No subscription on record: complete onboarding first');
    }
    await this.handleSubscriptionTrouble(sub.razorpay_subscription_id, 'halted');
    return { success: true };
  }
}
