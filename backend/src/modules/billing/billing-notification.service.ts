import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingNotificationKind } from '@prisma/client';

export const BOLNA_TOPUP_URL = 'https://platform.bolna.ai';
export const AISENSY_DASHBOARD_URL = 'https://www.app.aisensy.com';

/**
 * BillingNotification lifecycle. "Open" = resolved_at IS NULL; an open
 * notification of the same kind suppresses duplicates, so low-balance alerts
 * fire ONCE per threshold crossing, not on every 30-minute poll. When the
 * condition heals (balance recovers, mandate charged) resolveOpen() closes it
 * so the next crossing alerts again.
 */
@Injectable()
export class BillingNotificationService {
  private readonly logger = new Logger(BillingNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /** Create unless an open one of this kind already exists for the tenant. */
  async createOnce(businessId: string, kind: BillingNotificationKind, message: string) {
    const open = await this.prisma.billingNotification.findFirst({
      where: { business_id: businessId, kind, resolved_at: null },
    });
    if (open) return { created: false, notification: open };
    const notification = await this.prisma.billingNotification.create({
      data: { business_id: businessId, kind, message },
    });
    this.logger.log(`Billing notification [${kind}] for business ${businessId}`);
    return { created: true, notification };
  }

  /** Always create (used for per-event notifications like DEBIT_SUCCESS). */
  async create(businessId: string, kind: BillingNotificationKind, message: string) {
    return this.prisma.billingNotification.create({
      data: { business_id: businessId, kind, message, resolved_at: new Date() },
    });
  }

  /** Close open notifications of a kind (condition healed). */
  async resolveOpen(businessId: string, kind: BillingNotificationKind) {
    const res = await this.prisma.billingNotification.updateMany({
      where: { business_id: businessId, kind, resolved_at: null },
      data: { resolved_at: new Date() },
    });
    if (res.count > 0) this.logger.log(`Resolved ${res.count} open [${kind}] for ${businessId}`);
    return res.count;
  }

  async listForTenant(businessId: string, unreadOnly = false) {
    return this.prisma.billingNotification.findMany({
      where: { business_id: businessId, ...(unreadOnly ? { read_at: null } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async listAll(filter: { businessId?: string; kind?: BillingNotificationKind } = {}) {
    return this.prisma.billingNotification.findMany({
      where: {
        ...(filter.businessId ? { business_id: filter.businessId } : {}),
        ...(filter.kind ? { kind: filter.kind } : {}),
      },
      include: { business: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async markRead(id: string, businessId?: string) {
    const notification = await this.prisma.billingNotification.findFirst({
      where: { id, ...(businessId ? { business_id: businessId } : {}) },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.billingNotification.update({
      where: { id },
      data: { read_at: new Date() },
    });
  }

  /** Open banner conditions for the client dashboard. */
  async openBanners(businessId: string) {
    return this.prisma.billingNotification.findMany({
      where: {
        business_id: businessId,
        resolved_at: null,
        kind: { in: ['BOLNA_LOW', 'AISENSY_LOW', 'MANDATE_FAILED'] },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Best-effort email nudge via Resend (optional RESEND_API_KEY). Failure is
   * logged and swallowed: the in-app notification is the source of truth.
   */
  async emailNudge(to: string | null | undefined, subject: string, text: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('BILLING_EMAIL_FROM') || 'billing@praecisai.in';
    if (!apiKey || !to) return;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!res.ok) this.logger.warn(`Email nudge failed (${res.status}) to ${to}`);
    } catch (err: any) {
      this.logger.warn(`Email nudge error: ${err?.message || err}`);
    }
  }

  /**
   * AiSensy send-failure hook: called from the WhatsApp send path when a send
   * fails. Only balance/plan problems raise AISENSY_LOW: ordinary delivery
   * failures (wrong number etc.) are ignored here.
   */
  async flagAisensyFailureIfBalance(businessId: string, errorText: string) {
    const t = (errorText || '').toLowerCase();
    const balanceIssue =
      t.includes('insufficient') ||
      t.includes('balance') ||
      t.includes('credit') ||
      t.includes('expired') ||
      t.includes('plan') ||
      t.includes('quota') ||
      t.includes('limit exceeded');
    if (!balanceIssue) return;
    await this.createOnce(
      businessId,
      'AISENSY_LOW',
      `WhatsApp sending failed: AiSensy balance or plan issue. Top up or renew directly on AiSensy: ${AISENSY_DASHBOARD_URL}`,
    );
  }
}
