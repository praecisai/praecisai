import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingNotificationService } from './billing-notification.service';
import { SalesSheetService } from './sales-sheet.service';
import {
  AUTOPAY_MAX_PAISE,
  CreditKind,
  CreditPack,
  ModelTier,
  callCreditsForSeconds,
  callPacks,
  callPackFor,
  MIN_CUSTOM_CREDITS,
  MAX_CUSTOM_CREDITS,
  findPack,
  isModelTier,
  roundCredits,
  whatsappPacks,
} from './credit-packs.util';

type Reason = 'PURCHASE' | 'AUTOPAY' | 'USAGE' | 'ADJUSTMENT';

/** A call needs at least this many minutes left to be dialled. */
const MIN_CALL_CREDITS = 1;
/**
 * Calls are charged only when they end, so minutes are held back for calls
 * already dialled: without this, a business with 1 minute left could start a
 * dozen calls (one every 5s) before the first one is charged.
 */
const IN_FLIGHT_RESERVE_MINUTES = 2;
/** A dialled call still PENDING after this long lost its webhook; stop holding for it. */
const IN_FLIGHT_WINDOW_MS = 3 * 60 * 60 * 1000;
/** Don't start a second autopay debit for the same kind while one is in flight. */
const AUTOPAY_INFLIGHT_MS = 48 * 60 * 60 * 1000;
/** After a failed autopay debit, wait this long before trying again. */
const AUTOPAY_RETRY_AFTER_MS = 24 * 60 * 60 * 1000;

export class OutOfCreditsError extends BadRequestException {}
/** Enough minutes overall, but they are held by calls still in progress: retry shortly. */
export class CreditsHeldError extends OutOfCreditsError {}

/**
 * Prepaid credits: one wallet per business (call minutes + WhatsApp messages),
 * an append-only ledger, pack purchases through Razorpay, per-use deduction,
 * low-balance warnings and autopay top-ups.
 *
 * Only businesses with credit_billing = true are charged or blocked. Every
 * other business (legacy direct billing) is never touched by this service.
 */
@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private invoices: BillingInvoiceService,
    private notifications: BillingNotificationService,
    private salesSheet: SalesSheetService,
  ) {}

  // ─── Wallet + ledger ────────────────────────────────────────────────────────

  async getAccount(businessId: string) {
    return this.prisma.creditAccount.upsert({
      where: { business_id: businessId },
      create: { business_id: businessId },
      update: {},
    });
  }

  private balanceField(kind: CreditKind) {
    return kind === 'CALL' ? 'call_credits' : 'whatsapp_credits';
  }

  /**
   * Move credits and write the ledger row in one transaction. Idempotent per
   * (kind, reason, refId): a replayed webhook or a second call for the same
   * call log is a no-op and returns applied=false.
   */
  async applyDelta(
    businessId: string,
    kind: CreditKind,
    delta: number,
    reason: Reason,
    refId: string | null,
    note?: string,
  ): Promise<{ applied: boolean; balance: number }> {
    const amount = roundCredits(delta);
    await this.getAccount(businessId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.creditTransaction.create({
          data: {
            business_id: businessId,
            kind,
            delta: amount,
            balance_after: 0,
            reason,
            ref_id: refId,
            note: note ?? null,
          },
        });
        const field = this.balanceField(kind);
        const account = await tx.creditAccount.update({
          where: { business_id: businessId },
          data: { [field]: { increment: amount } },
        });
        const balance = roundCredits((account as any)[field]);
        await tx.creditTransaction.update({
          where: { id: row.id },
          data: { balance_after: balance },
        });
        return { applied: true, balance };
      });
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const account = await this.getAccount(businessId);
        return {
          applied: false,
          balance: roundCredits((account as any)[this.balanceField(kind)]),
        };
      }
      throw err;
    }
  }

  private async creditBillingOn(businessId: string): Promise<boolean> {
    const b = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { credit_billing: true },
    });
    return !!b?.credit_billing;
  }

  // ─── Enforcement (called before dialling / sending) ────────────────────────

  /**
   * Throws a readable error when a credit-billed business has no call minutes
   * left. With reserveInFlight (the dialler), minutes held by calls still in
   * progress are not counted, and CreditsHeldError says to retry shortly.
   */
  async assertCanCall(
    businessId: string,
    opts?: { reserveInFlight?: boolean },
  ): Promise<void> {
    if (!(await this.creditBillingOn(businessId))) return;
    const account = await this.getAccount(businessId);
    if (account.call_credits < MIN_CALL_CREDITS) {
      throw new OutOfCreditsError(
        `Out of call credits: ${Math.max(0, roundCredits(account.call_credits))} minutes left. Add call credits in Billing & Usage to start calling.`,
      );
    }
    if (!opts?.reserveInFlight) return;
    const inFlight = await this.prisma.callLog.count({
      where: {
        business_id: businessId,
        call_status: 'PENDING',
        retell_call_id: { not: null },
        created_at: { gte: new Date(Date.now() - IN_FLIGHT_WINDOW_MS) },
      },
    });
    if (account.call_credits - inFlight * IN_FLIGHT_RESERVE_MINUTES < MIN_CALL_CREDITS) {
      throw new CreditsHeldError(
        `Call credits held by ${inFlight} call(s) in progress: ${roundCredits(account.call_credits)} minutes left.`,
      );
    }
  }

  /** Throws when a credit-billed business cannot cover `count` WhatsApp messages. */
  async assertCanSendWhatsapp(businessId: string, count = 1): Promise<void> {
    if (!(await this.creditBillingOn(businessId))) return;
    const account = await this.getAccount(businessId);
    if (account.whatsapp_credits < count) {
      throw new OutOfCreditsError(
        `Out of WhatsApp credits: ${Math.max(0, Math.floor(account.whatsapp_credits))} messages left. Add WhatsApp credits in Billing & Usage to start sending.`,
      );
    }
  }

  // ─── Usage (called after the fact) ──────────────────────────────────────────

  /** Charge a finished call: per second of talk time. Safe to call twice. */
  async chargeCall(callLogId: string): Promise<void> {
    const log = await this.prisma.callLog.findUnique({
      where: { id: callLogId },
      select: { id: true, business_id: true, duration_seconds: true },
    });
    if (!log || !(await this.creditBillingOn(log.business_id))) return;
    const credits = callCreditsForSeconds(log.duration_seconds);
    if (credits <= 0) return;
    const { applied } = await this.applyDelta(
      log.business_id,
      'CALL',
      -credits,
      'USAGE',
      log.id,
      `AI call: ${Math.round(log.duration_seconds ?? 0)} seconds`,
    );
    if (applied) await this.afterDebit(log.business_id, 'CALL');
  }

  /** Charge one sent WhatsApp message (by its WhatsAppLog id). */
  async chargeWhatsapp(
    businessId: string,
    whatsappLogId: string,
    note?: string,
  ): Promise<void> {
    if (!(await this.creditBillingOn(businessId))) return;
    const { applied } = await this.applyDelta(
      businessId,
      'WHATSAPP',
      -1,
      'USAGE',
      whatsappLogId,
      note ?? 'WhatsApp message',
    );
    if (applied) await this.afterDebit(businessId, 'WHATSAPP');
  }

  /** Low-balance warning (once per crossing) and autopay top-up. */
  private async afterDebit(businessId: string, kind: CreditKind) {
    const account = await this.getAccount(businessId);
    const balance =
      kind === 'CALL' ? account.call_credits : account.whatsapp_credits;
    const threshold =
      kind === 'CALL'
        ? account.call_low_threshold
        : account.whatsapp_low_threshold;
    if (balance >= threshold) return;

    const alertedField =
      kind === 'CALL' ? 'call_low_alerted' : 'whatsapp_low_alerted';
    if (!(account as any)[alertedField]) {
      await this.prisma.creditAccount.update({
        where: { business_id: businessId },
        data: { [alertedField]: true },
      });
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, billing_email: true },
      });
      const what =
        kind === 'CALL'
          ? `${roundCredits(Math.max(0, balance))} call minutes`
          : `${Math.floor(Math.max(0, balance))} WhatsApp messages`;
      const autopayNote = account.autopay_enabled
        ? 'Autopay is on, so a top-up has been started automatically.'
        : 'Buy more credits, or switch on autopay, in Billing & Usage.';
      await this.notifications.emailNudge(
        business?.billing_email,
        'PraecisAI: your credits are running low',
        `Hello ${business?.name ?? ''},\n\nYou have ${what} left, below your alert level of ${threshold}. ${kind === 'CALL' ? 'AI calls' : 'WhatsApp messages'} stop when credits run out.\n\n${autopayNote}\n\nPraecisAI`,
      );
    }

    await this.triggerAutopay(businessId, kind).catch((err) =>
      this.logger.warn(
        `Autopay for ${businessId} (${kind}) failed to start: ${err?.message}`,
      ),
    );
  }

  // ─── Read model for the Billing page ────────────────────────────────────────

  async modelTiers() {
    return this.prisma.callModelTier.findMany({ orderBy: { tier: 'asc' } });
  }

  async summary(businessId: string) {
    await this.reconcilePending(businessId).catch((err) =>
      this.logger.warn(
        `Credit reconcile failed for ${businessId}: ${err?.message}`,
      ),
    );

    const [business, account, tiers, transactions] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { call_model_tier: true, credit_billing: true },
      }),
      this.getAccount(businessId),
      this.modelTiers(),
      this.prisma.creditTransaction.findMany({
        where: { business_id: businessId },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
    ]);
    const tier: ModelTier = isModelTier(business?.call_model_tier)
      ? (business!.call_model_tier as ModelTier)
      : 'A';
    const tierRow = tiers.find((t) => t.tier === tier);

    // This calendar month's usage (IST), from the ledger
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const monthFrom = new Date(
      Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) -
        5.5 * 60 * 60 * 1000,
    );
    const usage = await this.prisma.creditTransaction.groupBy({
      by: ['kind'],
      where: {
        business_id: businessId,
        reason: 'USAGE',
        created_at: { gte: monthFrom },
      },
      _sum: { delta: true },
    });
    const used = (k: CreditKind) =>
      roundCredits(-(usage.find((u) => u.kind === k)?._sum.delta ?? 0));

    const pendingAutopay = await this.prisma.billingPayment.findMany({
      where: {
        business_id: businessId,
        type: 'CREDITS',
        is_autopay: true,
        status: 'CREATED',
      },
      select: {
        id: true,
        credit_kind: true,
        credit_units: true,
        total_amount: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    return {
      credit_billing: !!business?.credit_billing,
      model: {
        tier,
        label: tierRow?.label ?? `Model ${tier}`,
        description: tierRow?.description ?? '',
      },
      call: {
        balance: roundCredits(account.call_credits),
        threshold: account.call_low_threshold,
        low: account.call_credits < account.call_low_threshold,
        used_this_month: used('CALL'),
      },
      whatsapp: {
        balance: roundCredits(account.whatsapp_credits),
        threshold: account.whatsapp_low_threshold,
        low: account.whatsapp_credits < account.whatsapp_low_threshold,
        used_this_month: used('WHATSAPP'),
      },
      packs: { call: callPacks(tier), whatsapp: whatsappPacks() },
      custom_limits: { min: MIN_CUSTOM_CREDITS, max: MAX_CUSTOM_CREDITS },
      autopay: {
        enabled: account.autopay_enabled,
        status: account.autopay_status,
        method: account.autopay_method,
        call_pack: account.autopay_call_pack,
        whatsapp_pack: account.autopay_whatsapp_pack,
        last_error: account.autopay_last_error,
        last_charge_at: account.autopay_last_charge_at,
        max_debit_paise: AUTOPAY_MAX_PAISE,
        pending: pendingAutopay,
      },
      transactions,
    };
  }

  /** Customer-set alert levels (also the autopay trigger points). */
  async setThresholds(
    businessId: string,
    dto: { call?: number; whatsapp?: number },
  ) {
    const data: Prisma.CreditAccountUpdateInput = {};
    if (dto.call !== undefined) {
      if (!(dto.call >= 0 && dto.call <= 100000))
        throw new BadRequestException(
          'Call alert level must be 0 to 100,000 minutes',
        );
      data.call_low_threshold = dto.call;
      data.call_low_alerted = false;
    }
    if (dto.whatsapp !== undefined) {
      if (!(dto.whatsapp >= 0 && dto.whatsapp <= 1000000))
        throw new BadRequestException(
          'WhatsApp alert level must be 0 to 1,000,000 messages',
        );
      data.whatsapp_low_threshold = dto.whatsapp;
      data.whatsapp_low_alerted = false;
    }
    await this.getAccount(businessId);
    await this.prisma.creditAccount.update({
      where: { business_id: businessId },
      data,
    });
    return this.summary(businessId);
  }

  /** Banners for the dashboard: only credit-billed businesses below their alert level. */
  async lowCreditBanners(businessId: string) {
    if (!(await this.creditBillingOn(businessId))) return [];
    const a = await this.getAccount(businessId);
    const out: Array<{ id: string; kind: string; message: string }> = [];
    const autopay = a.autopay_enabled && a.autopay_status === 'ACTIVE';
    // An empty wallet (a new tenant, or everything used up) is not "low": the
    // feature is off until credits are bought, so say so plainly.
    const callEmpty = a.call_credits < MIN_CALL_CREDITS;
    const waEmpty = a.whatsapp_credits < 1;
    if (callEmpty || waEmpty) {
      out.push({
        id: 'credits-empty',
        kind: 'CREDITS_EMPTY',
        message:
          callEmpty && waEmpty
            ? 'Add credits to start AI calls and WhatsApp reminders. Your dashboard is ready; nothing is sent until you buy credits (minimum 100).'
            : callEmpty
              ? 'Add call credits to start AI calls. No calls go out until you buy call credits (minimum 100).'
              : 'Add WhatsApp credits to start WhatsApp reminders. No messages go out until you buy WhatsApp credits (minimum 100).',
      });
    }
    if (!callEmpty && a.call_credits < a.call_low_threshold) {
      out.push({
        id: 'credits-call-low',
        kind: 'CREDITS_LOW',
        message: `Call credits are low: ${roundCredits(Math.max(0, a.call_credits))} minutes left (alert level ${a.call_low_threshold}). ${autopay && a.autopay_call_pack ? 'Autopay will top up automatically.' : 'AI calls stop when credits run out.'}`,
      });
    }
    if (!waEmpty && a.whatsapp_credits < a.whatsapp_low_threshold) {
      out.push({
        id: 'credits-whatsapp-low',
        kind: 'CREDITS_LOW',
        message: `WhatsApp credits are low: ${Math.floor(Math.max(0, a.whatsapp_credits))} messages left (alert level ${a.whatsapp_low_threshold}). ${autopay && a.autopay_whatsapp_pack ? 'Autopay will top up automatically.' : 'WhatsApp messages stop when credits run out.'}`,
      });
    }
    if (a.autopay_enabled && a.autopay_last_error) {
      out.push({
        id: 'credits-autopay-error',
        kind: 'AUTOPAY_FAILED',
        message: `Last autopay top-up failed: ${a.autopay_last_error}. Buy credits manually or set up autopay again.`,
      });
    }
    return out;
  }

  // ─── Manual purchase (Razorpay Checkout, one-time order) ───────────────────

  /** The pack must exist and, for calls, match the business's current model. */
  private async resolvePackFor(
    businessId: string,
    packId: string,
  ): Promise<CreditPack> {
    const pack = findPack(packId);
    if (!pack)
      throw new BadRequestException(
        `Buy between ${MIN_CUSTOM_CREDITS.toLocaleString('en-IN')} and ${MAX_CUSTOM_CREDITS.toLocaleString('en-IN')} credits at a time`,
      );
    if (pack.kind === 'CALL') {
      const b = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { call_model_tier: true },
      });
      const tier = isModelTier(b?.call_model_tier) ? b!.call_model_tier : 'A';
      if (pack.tier !== tier)
        throw new BadRequestException(
          'That call pack is for a different AI model. Refresh the page and try again.',
        );
    }
    return pack;
  }

  private packLabel(pack: CreditPack) {
    return pack.kind === 'CALL'
      ? `${pack.units.toLocaleString('en-IN')} call minutes (Model ${pack.tier})`
      : `${pack.units.toLocaleString('en-IN')} WhatsApp messages`;
  }

  async createCheckout(businessId: string, packId: string) {
    const pack = await this.resolvePackFor(businessId, packId);
    const order = await this.razorpay.createOrder({
      amountPaise: pack.pricePaise,
      receipt: `cr_${businessId.slice(0, 8)}_${Date.now()}`,
      notes: {
        praecis_business_id: businessId,
        praecis_type: 'credits',
        praecis_pack: pack.id,
      },
    });
    const payment = await this.prisma.billingPayment.create({
      data: {
        business_id: businessId,
        type: 'CREDITS',
        razorpay_order_id: order.id,
        base_amount: pack.pricePaise,
        gst_amount: 0,
        total_amount: pack.pricePaise,
        status: 'CREATED',
        credit_kind: pack.kind,
        credit_units: pack.units,
        credit_pack: pack.id,
      },
    });
    return {
      mock: this.razorpay.isMock,
      razorpay_key_id: this.razorpay.keyId ?? null,
      order_id: order.id,
      payment_record_id: payment.id,
      amount_paise: pack.pricePaise,
      description: this.packLabel(pack),
      pack,
    };
  }

  /** Browser checkout success: verify signature, add credits immediately. */
  async verifyCheckout(
    businessId: string,
    dto: { order_id: string; payment_id: string; signature: string },
  ) {
    const pending = await this.prisma.billingPayment.findFirst({
      where: {
        business_id: businessId,
        razorpay_order_id: dto.order_id,
        type: 'CREDITS',
      },
    });
    if (!pending)
      throw new BadRequestException('No credit purchase found for this order');
    const ok = this.razorpay.verifyOrderPaymentSignature({
      orderId: dto.order_id,
      paymentId: dto.payment_id,
      signature: dto.signature,
    });
    if (!ok) throw new BadRequestException('Payment verification failed');
    const paid = await this.handleCaptured({
      razorpayOrderId: dto.order_id,
      razorpayPaymentId: dto.payment_id,
    });
    return {
      success: true,
      payment: paid,
      summary: await this.summary(businessId),
    };
  }

  /**
   * payment.captured for a credits order (manual, autopay setup, or autopay
   * debit). Marks the payment PAID, adds the credits, invoices it. Idempotent.
   * Returns null when the order is not a credits order.
   */
  async handleCaptured(opts: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    method?: string | null;
    tokenId?: string | null;
  }) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: { razorpay_order_id: opts.razorpayOrderId, type: 'CREDITS' },
      orderBy: { created_at: 'desc' },
    });
    if (!payment) return null;
    if (payment.status === 'PAID') return payment;

    const paid = await this.prisma.billingPayment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paid_at: new Date(),
        razorpay_payment_id: opts.razorpayPaymentId,
        failure_reason: null,
      },
    });
    const kind = (
      paid.credit_kind === 'WHATSAPP' ? 'WHATSAPP' : 'CALL'
    ) as CreditKind;
    const pack = findPack(paid.credit_pack);
    const units = paid.credit_units ?? pack?.units ?? 0;
    const label = pack ? this.packLabel(pack) : `${units} credits`;
    await this.applyDelta(
      paid.business_id,
      kind,
      units,
      paid.is_autopay ? 'AUTOPAY' : 'PURCHASE',
      paid.id,
      `Bought ${label}`,
    );

    // Topped up above the alert level: the next drop alerts again
    const account = await this.getAccount(paid.business_id);
    const healed =
      kind === 'CALL'
        ? account.call_credits >= account.call_low_threshold
        : account.whatsapp_credits >= account.whatsapp_low_threshold;
    await this.prisma.creditAccount.update({
      where: { business_id: paid.business_id },
      data: {
        ...(healed
          ? {
              [kind === 'CALL' ? 'call_low_alerted' : 'whatsapp_low_alerted']:
                false,
            }
          : {}),
        ...(paid.is_autopay
          ? { autopay_last_charge_at: new Date(), autopay_last_error: null }
          : {}),
      },
    });

    // Autopay setup payment: it also saved the token on the customer
    if (
      account.autopay_setup_order_id &&
      account.autopay_setup_order_id === opts.razorpayOrderId
    ) {
      await this.captureAutopayToken(
        paid.business_id,
        opts.razorpayPaymentId,
        opts.method,
        opts.tokenId,
      ).catch((err) =>
        this.logger.warn(
          `Could not save autopay token for ${paid.business_id}: ${err?.message}`,
        ),
      );
    }

    await this.invoices.createForPayment(paid);
    this.salesSheet.logPayment(paid.id);
    this.logger.log(`Credits added for ${paid.business_id}: ${label}`);
    return paid;
  }

  /** payment.failed for a credits order. */
  async handleFailed(opts: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    reason?: string;
  }) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: {
        razorpay_order_id: opts.razorpayOrderId,
        type: 'CREDITS',
        status: 'CREATED',
      },
    });
    if (!payment) return null;
    const reason = opts.reason || 'Payment failed';
    // A checkout the customer abandons or retries keeps the order open; only
    // autopay debits (no human in the loop) are closed out as FAILED here.
    if (!payment.is_autopay) return payment;
    await this.prisma.billingPayment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failure_reason: reason,
        ...(opts.razorpayPaymentId
          ? { razorpay_payment_id: opts.razorpayPaymentId }
          : {}),
      },
    });
    await this.prisma.creditAccount.update({
      where: { business_id: payment.business_id },
      data: { autopay_last_error: reason },
    });
    return payment;
  }

  /**
   * Webhooks never reach localhost and can be delayed in production, so the
   * Billing page also asks Razorpay about credit payments still open.
   */
  async reconcilePending(businessId: string) {
    if (this.razorpay.isMock) return;
    const open = await this.prisma.billingPayment.findMany({
      where: {
        business_id: businessId,
        type: 'CREDITS',
        status: 'CREATED',
        razorpay_order_id: { not: null },
        created_at: {
          lt: new Date(Date.now() - 60 * 1000),
          gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      take: 5,
    });
    for (const p of open) {
      const attempts = await this.razorpay.fetchOrderPayments(
        p.razorpay_order_id!,
      );
      const captured = attempts.find((a) => a.status === 'captured');
      if (captured) {
        await this.handleCaptured({
          razorpayOrderId: p.razorpay_order_id!,
          razorpayPaymentId: captured.id,
          method: captured.method,
          tokenId: captured.token_id,
        });
      } else if (
        p.is_autopay &&
        attempts.length > 0 &&
        attempts.every((a) => a.status === 'failed')
      ) {
        await this.handleFailed({
          razorpayOrderId: p.razorpay_order_id!,
          razorpayPaymentId: attempts[0].id,
          reason: attempts[0].error_description || 'Payment failed',
        });
      }
    }

    // Autopay waiting for the bank to confirm the mandate
    const account = await this.getAccount(businessId);
    if (account.autopay_status === 'PENDING' && account.razorpay_token_id) {
      await this.refreshTokenStatus(businessId);
    }
  }

  // ─── Autopay ────────────────────────────────────────────────────────────────

  private assertAutopayPack(
    packId: string | null | undefined,
    kind: CreditKind,
  ): CreditPack | null {
    if (!packId) return null;
    const pack = findPack(packId);
    if (!pack || pack.kind !== kind)
      throw new BadRequestException('Unknown autopay pack');
    if (!pack.autopayEligible) {
      throw new BadRequestException(
        'Autopay can top up at most ₹15,000 at a time. Pick a smaller pack, or buy big packs manually.',
      );
    }
    return pack;
  }

  /**
   * Start autopay: the customer pays for their chosen pack now through
   * Razorpay Checkout, and in the same step approves future automatic debits
   * (UPI Autopay or card) of up to ₹15,000 each. Credits for this first pack
   * are added on capture; the saved token is then used for later top-ups.
   */
  async setupAutopay(
    businessId: string,
    dto: {
      call_pack?: string | null;
      whatsapp_pack?: string | null;
      method: 'upi' | 'card';
    },
  ) {
    if (dto.method !== 'upi' && dto.method !== 'card')
      throw new BadRequestException('Choose UPI Autopay or card');
    const callPack = this.assertAutopayPack(dto.call_pack, 'CALL');
    const waPack = this.assertAutopayPack(dto.whatsapp_pack, 'WHATSAPP');
    if (!callPack && !waPack)
      throw new BadRequestException(
        'Pick a call pack, a WhatsApp pack, or both',
      );
    if (callPack) await this.resolvePackFor(businessId, callPack.id);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        billing_email: true,
        razorpay_customer_id: true,
        users: { select: { email: true, phone: true }, take: 1 },
      },
    });
    if (!business) throw new NotFoundException('Business not found');

    let customerId = business.razorpay_customer_id;
    if (!customerId) {
      const customer = await this.razorpay.createCustomer({
        name: business.name,
        email: business.billing_email || business.users[0]?.email,
        contact: business.users[0]?.phone,
        notes: { praecis_business_id: businessId },
      });
      customerId = customer.id;
      await this.prisma.business.update({
        where: { id: businessId },
        data: { razorpay_customer_id: customerId },
      });
    }

    // The first payment buys the call pack (or the WhatsApp pack if only that
    // was picked); the other kind is topped up by autopay when it runs low.
    const firstPack = (callPack ?? waPack)!;
    const order = await this.razorpay.createRecurringAuthOrder({
      amountPaise: firstPack.pricePaise,
      customerId,
      method: dto.method,
      maxAmountPaise: AUTOPAY_MAX_PAISE,
      receipt: `ap_${businessId.slice(0, 8)}_${Date.now()}`,
      notes: {
        praecis_business_id: businessId,
        praecis_type: 'credits',
        praecis_pack: firstPack.id,
        praecis_autopay_setup: '1',
      },
    });

    const payment = await this.prisma.billingPayment.create({
      data: {
        business_id: businessId,
        type: 'CREDITS',
        razorpay_order_id: order.id,
        base_amount: firstPack.pricePaise,
        gst_amount: 0,
        total_amount: firstPack.pricePaise,
        status: 'CREATED',
        credit_kind: firstPack.kind,
        credit_units: firstPack.units,
        credit_pack: firstPack.id,
      },
    });

    // Starting over: any previous token is replaced once this one is saved
    await this.getAccount(businessId);
    await this.prisma.creditAccount.update({
      where: { business_id: businessId },
      data: {
        autopay_enabled: false,
        autopay_status: 'PENDING',
        autopay_method: dto.method,
        autopay_call_pack: callPack?.id ?? null,
        autopay_whatsapp_pack: waPack?.id ?? null,
        razorpay_token_id: null,
        autopay_setup_order_id: order.id,
        autopay_last_error: null,
      },
    });

    return {
      mock: this.razorpay.isMock,
      razorpay_key_id: this.razorpay.keyId ?? null,
      order_id: order.id,
      customer_id: customerId,
      payment_record_id: payment.id,
      amount_paise: firstPack.pricePaise,
      method: dto.method,
      description: `${this.packLabel(firstPack)} + autopay`,
    };
  }

  /** After the setup payment: read the token off the payment and switch autopay on. */
  private async captureAutopayToken(
    businessId: string,
    paymentId: string,
    method?: string | null,
    tokenId?: string | null,
  ) {
    let token = tokenId ?? null;
    let payMethod = method ?? null;
    if (!token) {
      const payment = await this.razorpay.fetchPayment(paymentId);
      token = payment?.token_id ?? null;
      payMethod = payment?.method ?? payMethod;
    }
    if (!token) {
      await this.prisma.creditAccount.update({
        where: { business_id: businessId },
        data: {
          autopay_status: 'FAILED',
          autopay_setup_order_id: null,
          autopay_last_error:
            'Your bank did not approve automatic payments. Try again or use another method.',
        },
      });
      return;
    }
    await this.prisma.creditAccount.update({
      where: { business_id: businessId },
      data: {
        razorpay_token_id: token,
        autopay_method: payMethod ?? undefined,
        autopay_setup_order_id: null,
      },
    });
    await this.refreshTokenStatus(businessId);
  }

  /** Card mandates are usable at once; UPI Autopay waits for the bank to confirm. */
  async refreshTokenStatus(businessId: string) {
    const [account, business] = await Promise.all([
      this.getAccount(businessId),
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { razorpay_customer_id: true },
      }),
    ]);
    if (!account.razorpay_token_id || !business?.razorpay_customer_id) return;
    const token = await this.razorpay.fetchToken(
      business.razorpay_customer_id,
      account.razorpay_token_id,
    );
    const status: string =
      token?.recurring_details?.status ??
      (token?.recurring ? 'confirmed' : 'initiated');
    await this.applyTokenStatus(
      businessId,
      status,
      token?.recurring_details?.failure_reason,
    );
  }

  async applyTokenStatus(
    businessId: string,
    status: string,
    failureReason?: string | null,
  ) {
    if (status === 'confirmed') {
      await this.prisma.creditAccount.update({
        where: { business_id: businessId },
        data: {
          autopay_status: 'ACTIVE',
          autopay_enabled: true,
          autopay_last_error: null,
        },
      });
    } else if (
      ['rejected', 'cancelled', 'paused', 'expired'].includes(status)
    ) {
      await this.prisma.creditAccount.update({
        where: { business_id: businessId },
        data: {
          autopay_status: 'FAILED',
          autopay_enabled: false,
          autopay_last_error: failureReason || `Autopay mandate ${status}`,
        },
      });
    }
    // "initiated": still waiting on the bank, leave PENDING
  }

  /** Webhook token.* events carry the token id, not the business. */
  async handleTokenEvent(
    tokenId: string,
    status: string,
    failureReason?: string | null,
  ) {
    const account = await this.prisma.creditAccount.findFirst({
      where: { razorpay_token_id: tokenId },
    });
    if (!account) return;
    await this.applyTokenStatus(account.business_id, status, failureReason);
  }

  /** Change which packs autopay buys, without a new mandate. */
  async updateAutopayPacks(
    businessId: string,
    dto: { call_pack?: string | null; whatsapp_pack?: string | null },
  ) {
    const callPack =
      dto.call_pack === undefined
        ? undefined
        : this.assertAutopayPack(dto.call_pack, 'CALL');
    const waPack =
      dto.whatsapp_pack === undefined
        ? undefined
        : this.assertAutopayPack(dto.whatsapp_pack, 'WHATSAPP');
    if (callPack) await this.resolvePackFor(businessId, callPack.id);
    await this.getAccount(businessId);
    await this.prisma.creditAccount.update({
      where: { business_id: businessId },
      data: {
        ...(callPack !== undefined
          ? { autopay_call_pack: callPack?.id ?? null }
          : {}),
        ...(waPack !== undefined
          ? { autopay_whatsapp_pack: waPack?.id ?? null }
          : {}),
      },
    });
    return this.summary(businessId);
  }

  async disableAutopay(businessId: string) {
    const [account, business] = await Promise.all([
      this.getAccount(businessId),
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { razorpay_customer_id: true },
      }),
    ]);
    if (account.razorpay_token_id && business?.razorpay_customer_id) {
      await this.razorpay
        .deleteToken(business.razorpay_customer_id, account.razorpay_token_id)
        .catch((err) =>
          this.logger.warn(
            `Token delete failed for ${businessId}: ${err?.message}`,
          ),
        );
    }
    await this.prisma.creditAccount.update({
      where: { business_id: businessId },
      data: {
        autopay_enabled: false,
        autopay_status: 'NONE',
        razorpay_token_id: null,
        autopay_setup_order_id: null,
        autopay_last_error: null,
      },
    });
    return this.summary(businessId);
  }

  /**
   * Charge the saved token for this kind's autopay pack, when the balance is
   * below the alert level. Guarded so a burst of calls starts one debit only.
   */
  async triggerAutopay(businessId: string, kind: CreditKind): Promise<boolean> {
    const account = await this.getAccount(businessId);
    if (
      !account.autopay_enabled ||
      account.autopay_status !== 'ACTIVE' ||
      !account.razorpay_token_id
    )
      return false;
    const balance =
      kind === 'CALL' ? account.call_credits : account.whatsapp_credits;
    const threshold =
      kind === 'CALL'
        ? account.call_low_threshold
        : account.whatsapp_low_threshold;
    if (balance >= threshold) return false;

    let packId =
      kind === 'CALL'
        ? account.autopay_call_pack
        : account.autopay_whatsapp_pack;
    if (!packId) return false;
    // The business may have moved to another AI model since autopay was set:
    // buy the same number of minutes at the current model's rate.
    if (kind === 'CALL') {
      const b = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { call_model_tier: true },
      });
      const tier = isModelTier(b?.call_model_tier) ? b!.call_model_tier : 'A';
      const minutes = findPack(packId)?.units;
      if (minutes) packId = callPackFor(tier as ModelTier, minutes).id;
    }
    const pack = findPack(packId);
    if (!pack || !pack.autopayEligible) return false;

    const since = new Date(Date.now() - AUTOPAY_INFLIGHT_MS);
    const inflight = await this.prisma.billingPayment.findFirst({
      where: {
        business_id: businessId,
        type: 'CREDITS',
        is_autopay: true,
        credit_kind: kind,
        status: 'CREATED',
        created_at: { gt: since },
      },
    });
    if (inflight) return false;
    const recentFail = await this.prisma.billingPayment.findFirst({
      where: {
        business_id: businessId,
        type: 'CREDITS',
        is_autopay: true,
        credit_kind: kind,
        status: 'FAILED',
        created_at: { gt: new Date(Date.now() - AUTOPAY_RETRY_AFTER_MS) },
      },
    });
    if (recentFail) return false;

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        razorpay_customer_id: true,
        billing_email: true,
        users: { select: { email: true, phone: true }, take: 1 },
      },
    });
    if (!business?.razorpay_customer_id) return false;

    const order = await this.razorpay.createOrder({
      amountPaise: pack.pricePaise,
      receipt: `auto_${businessId.slice(0, 8)}_${Date.now()}`,
      notes: {
        praecis_business_id: businessId,
        praecis_type: 'credits',
        praecis_pack: pack.id,
        praecis_autopay: '1',
      },
    });
    const payment = await this.prisma.billingPayment.create({
      data: {
        business_id: businessId,
        type: 'CREDITS',
        razorpay_order_id: order.id,
        base_amount: pack.pricePaise,
        gst_amount: 0,
        total_amount: pack.pricePaise,
        status: 'CREATED',
        credit_kind: pack.kind,
        credit_units: pack.units,
        credit_pack: pack.id,
        is_autopay: true,
      },
    });

    try {
      const customer = await this.razorpay.fetchCustomer(
        business.razorpay_customer_id,
      );
      const email =
        customer.email ||
        business.billing_email ||
        business.users[0]?.email ||
        '';
      const contact = customer.contact || business.users[0]?.phone || '';
      const res = await this.razorpay.createRecurringPayment({
        orderId: order.id,
        customerId: business.razorpay_customer_id,
        tokenId: account.razorpay_token_id,
        amountPaise: pack.pricePaise,
        email,
        contact,
        description: `Autopay: ${this.packLabel(pack)}`,
        notes: {
          praecis_business_id: businessId,
          praecis_type: 'credits',
          praecis_pack: pack.id,
          praecis_autopay: '1',
        },
      });
      await this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: { razorpay_payment_id: res.razorpay_payment_id },
      });
      this.logger.log(
        `Autopay debit started for ${businessId}: ${this.packLabel(pack)}`,
      );
      // Mock mode has no bank: settle at once so the flow can be exercised
      if (this.razorpay.isMock) {
        await this.handleCaptured({
          razorpayOrderId: order.id,
          razorpayPaymentId: res.razorpay_payment_id,
        });
      }
      return true;
    } catch (err: any) {
      const reason = err?.message || 'Autopay debit could not be started';
      await this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failure_reason: reason },
      });
      await this.prisma.creditAccount.update({
        where: { business_id: businessId },
        data: { autopay_last_error: reason },
      });
      throw err;
    }
  }

  // ─── Mock-mode simulators ───────────────────────────────────────────────────

  async simulatePaid(businessId: string, orderId: string) {
    if (!this.razorpay.isMock)
      throw new BadRequestException(
        'Simulator is only available in Razorpay mock mode',
      );
    const payment = await this.prisma.billingPayment.findFirst({
      where: {
        business_id: businessId,
        razorpay_order_id: orderId,
        type: 'CREDITS',
      },
    });
    if (!payment)
      throw new BadRequestException('No credit purchase found for this order');
    await this.handleCaptured({
      razorpayOrderId: orderId,
      razorpayPaymentId: `pay_mock_${Date.now()}`,
      method: 'upi',
      tokenId: `token_mock_${Date.now()}`,
    });
    return this.summary(businessId);
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  /** Manual correction or opening balance, written to the ledger with a note. */
  async adminAdjust(
    businessId: string,
    kind: CreditKind,
    delta: number,
    note: string,
  ) {
    if (!Number.isFinite(delta) || delta === 0)
      throw new BadRequestException('Enter a non-zero amount');
    const res = await this.applyDelta(
      businessId,
      kind,
      delta,
      'ADJUSTMENT',
      randomUUID(),
      note || 'Adjusted by PraecisAI',
    );
    const account = await this.getAccount(businessId);
    if (
      account.call_credits >= account.call_low_threshold ||
      account.whatsapp_credits >= account.whatsapp_low_threshold
    ) {
      await this.prisma.creditAccount.update({
        where: { business_id: businessId },
        data: {
          ...(account.call_credits >= account.call_low_threshold
            ? { call_low_alerted: false }
            : {}),
          ...(account.whatsapp_credits >= account.whatsapp_low_threshold
            ? { whatsapp_low_alerted: false }
            : {}),
        },
      });
    }
    return res;
  }
}
