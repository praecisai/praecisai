import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantKeysService } from './tenant-keys.service';
import { isAllowedCouponPercent } from './billing-math.util';

export interface UpsertTenantDto {
  name?: string;
  allowedEmails?: string[];
  bolnaApiKey?: string;
  bolnaAgentId?: string;
  aisensyApiKey?: string;
  lowBalanceThresholdUsd?: number;
  billingEmail?: string;
  gstin?: string;
  handoffNumber?: string;
}

const TENANT_NOTE_PREFIX = 'tenant:';

/**
 * Admin operations across all tenants. API keys are write-only here: reads
 * only ever expose last-4 previews via TenantKeysService.keyPreviews().
 *
 * Allowed emails live in the flat allowed_emails table; the association to a
 * tenant is kept in its note column as "tenant:<businessId>". "Link users"
 * re-points already-signed-up User rows (auto-onboarding gives each fresh
 * signup its own empty business) to this tenant.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private tenantKeys: TenantKeysService,
  ) {}

  // ─── Tenants ────────────────────────────────────────────────────────────────

  async listTenants() {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const monthFrom = new Date(
      Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 60 * 60 * 1000,
    );

    const businesses = await this.prisma.business.findMany({
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        onboarding_status: true,
        test_call_passed: true,
        low_balance_threshold_usd: true,
        bolna_api_key: true,
        aisensy_api_key: true,
        trial_ends_at: true,
        created_at: true,
        billing_subscriptions: {
          select: { status: true, next_debit_date: true, mandate_type: true },
        },
        _count: { select: { customers: true } },
      },
    });

    const results = [] as any[];
    for (const b of businesses) {
      const [snapshot, callsThisMonth, campaigns, openBanners] = await Promise.all([
        this.prisma.usageSnapshot.findFirst({
          where: { business_id: b.id, source: 'BOLNA' },
          orderBy: { captured_at: 'desc' },
          select: { balance: true, captured_at: true },
        }),
        this.prisma.callLog.count({
          where: { business_id: b.id, created_at: { gte: monthFrom } },
        }),
        this.prisma.campaign.groupBy({
          by: ['status'],
          where: { business_id: b.id },
          _count: true,
        }),
        this.prisma.billingNotification.count({
          where: { business_id: b.id, resolved_at: null },
        }),
      ]);

      const sub = b.billing_subscriptions[0] ?? null;
      results.push({
        id: b.id,
        name: b.name,
        status: b.status,
        onboarding_status: b.onboarding_status,
        trial_active: !!b.trial_ends_at && b.trial_ends_at > new Date(),
        trial_ends_at: b.trial_ends_at,
        test_call_passed: b.test_call_passed,
        bolna_connected: !!b.bolna_api_key,
        aisensy_connected: !!b.aisensy_api_key,
        bolna_balance_usd: snapshot?.balance ?? null,
        bolna_balance_at: snapshot?.captured_at ?? null,
        low_balance_threshold_usd: b.low_balance_threshold_usd,
        mandate_status: sub?.status ?? null,
        next_debit_date: sub?.next_debit_date ?? null,
        calls_this_month: callsThisMonth,
        customers: b._count.customers,
        campaigns_active: campaigns
          .filter((c) => ['RUNNING', 'SCHEDULED'].includes(c.status as string))
          .reduce((s, c) => s + (c._count as number), 0),
        campaigns_paused: sub?.status === 'HALTED',
        open_alerts: openBanners,
        created_at: b.created_at,
      });
    }
    return results;
  }

  async getTenant(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        onboarding_status: true,
        test_call_passed: true,
        low_balance_threshold_usd: true,
        billing_email: true,
        gstin: true,
        handoff_number: true,
        bolna_api_key: true,
        bolna_agent_id: true,
        aisensy_api_key: true,
        created_at: true,
        billing_subscriptions: true,
        users: { select: { email: true, role: true, status: true } },
      },
    });
    if (!business) throw new NotFoundException('Tenant not found');

    const [previews, allowedEmails, onboardingPayment] = await Promise.all([
      this.tenantKeys.keyPreviews(id),
      this.prisma.allowedEmail.findMany({
        where: { note: { startsWith: `${TENANT_NOTE_PREFIX}${id}` } },
        select: { email: true, created_at: true },
      }),
      this.prisma.billingPayment.findFirst({
        where: { business_id: id, type: 'ONBOARDING', status: 'PAID' },
      }),
    ]);

    const { bolna_api_key, aisensy_api_key, bolna_agent_id, ...safe } = business;

    return {
      ...safe,
      keys: previews,
      allowed_emails: allowedEmails,
      checklist: {
        bolna_connected: !!bolna_api_key,
        aisensy_connected: !!aisensy_api_key,
        onboarding_paid: !!onboardingPayment,
        test_call_passed: business.test_call_passed,
      },
    };
  }

  async createTenant(dto: UpsertTenantDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Business name is required');
    const business = await this.prisma.business.create({
      data: {
        name: dto.name.trim(),
        billing_email: dto.billingEmail?.trim() || null,
        gstin: dto.gstin?.trim() || null,
        handoff_number: dto.handoffNumber?.trim() || null,
        ...(dto.lowBalanceThresholdUsd !== undefined
          ? { low_balance_threshold_usd: dto.lowBalanceThresholdUsd }
          : {}),
      },
    });

    if (dto.bolnaApiKey || dto.bolnaAgentId || dto.aisensyApiKey) {
      await this.tenantKeys.setKeys(business.id, {
        bolnaApiKey: dto.bolnaApiKey,
        bolnaAgentId: dto.bolnaAgentId,
        aisensyApiKey: dto.aisensyApiKey,
      });
    }

    if (dto.allowedEmails?.length) {
      await this.setAllowedEmails(business.id, dto.allowedEmails);
    }

    this.logger.log(`Tenant created: ${business.name} (${business.id})`);
    return this.getTenant(business.id);
  }

  async updateTenant(id: string, dto: UpsertTenantDto) {
    const existing = await this.prisma.business.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant not found');

    await this.prisma.business.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.billingEmail !== undefined ? { billing_email: dto.billingEmail?.trim() || null } : {}),
        ...(dto.gstin !== undefined ? { gstin: dto.gstin?.trim() || null } : {}),
        ...(dto.handoffNumber !== undefined
          ? { handoff_number: dto.handoffNumber?.trim() || null }
          : {}),
        ...(dto.lowBalanceThresholdUsd !== undefined
          ? { low_balance_threshold_usd: dto.lowBalanceThresholdUsd }
          : {}),
      },
    });

    if (dto.bolnaApiKey !== undefined || dto.bolnaAgentId !== undefined || dto.aisensyApiKey !== undefined) {
      await this.tenantKeys.setKeys(id, {
        bolnaApiKey: dto.bolnaApiKey,
        bolnaAgentId: dto.bolnaAgentId,
        aisensyApiKey: dto.aisensyApiKey,
      });
    }

    if (dto.allowedEmails) {
      await this.setAllowedEmails(id, dto.allowedEmails);
    }

    return this.getTenant(id);
  }

  async toggleTestCall(id: string, passed: boolean) {
    await this.prisma.business.update({
      where: { id },
      data: { test_call_passed: passed },
    });
    return this.getTenant(id);
  }

  /** Replace this tenant's allowlist entries (note = tenant:<id> · <name>). */
  private async setAllowedEmails(businessId: string, emails: string[]) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });
    const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];

    await this.prisma.allowedEmail.deleteMany({
      where: { note: { startsWith: `${TENANT_NOTE_PREFIX}${businessId}` } },
    });
    for (const email of clean) {
      await this.prisma.allowedEmail.upsert({
        where: { email },
        create: { email, note: `${TENANT_NOTE_PREFIX}${businessId} · ${business?.name ?? ''}` },
        update: { note: `${TENANT_NOTE_PREFIX}${businessId} · ${business?.name ?? ''}` },
      });
    }
  }

  /**
   * Attach already-signed-up users (matched by allowlisted email) to this
   * tenant. Auto-onboarding gives each new signup its own empty business;
   * this re-points them at the real one.
   */
  async linkUsers(businessId: string) {
    const allowed = await this.prisma.allowedEmail.findMany({
      where: { note: { startsWith: `${TENANT_NOTE_PREFIX}${businessId}` } },
      select: { email: true },
    });
    const emails = allowed.map((a) => a.email);
    if (!emails.length) return { linked: 0 };

    const users = await this.prisma.user.findMany({
      where: { email: { in: emails, mode: 'insensitive' }, business_id: { not: businessId } },
    });
    for (const user of users) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { business_id: businessId },
      });
      this.logger.log(`Linked user ${user.email} to tenant ${businessId}`);
    }
    return { linked: users.length };
  }

  // ─── Coupons ────────────────────────────────────────────────────────────────

  async listCoupons() {
    return this.prisma.coupon.findMany({
      orderBy: { created_at: 'desc' },
      include: { used_by: { select: { id: true, name: true } } },
    });
  }

  async createCoupon(dto: { code: string; percent: number; maxUses?: number; expiresAt?: string }) {
    const code = dto.code?.trim().toUpperCase();
    if (!code) throw new BadRequestException('Coupon code is required');
    if (!isAllowedCouponPercent(Number(dto.percent))) {
      throw new BadRequestException('Percent must be 5, 10, 15 or 20');
    }
    try {
      return await this.prisma.coupon.create({
        data: {
          code,
          percent: Number(dto.percent),
          max_uses: dto.maxUses && dto.maxUses > 0 ? dto.maxUses : 1,
          expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') throw new BadRequestException('A coupon with this code exists');
      throw err;
    }
  }

  async setCouponActive(id: string, active: boolean) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.prisma.coupon.update({ where: { id }, data: { active } });
  }

  // ─── Billing overview ───────────────────────────────────────────────────────

  async billingOverview() {
    const tenants = await this.prisma.business.findMany({
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        name: true,
        onboarding_status: true,
        billing_subscriptions: true,
        billing_payments: {
          orderBy: { created_at: 'desc' },
          take: 24,
          include: { coupon: { select: { code: true, percent: true } } },
        },
        billing_invoices: {
          orderBy: { created_at: 'desc' },
          take: 24,
          select: {
            id: true,
            invoice_number: true,
            total: true,
            created_at: true,
            pdf_url: true,
          },
        },
      },
    });
    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      onboarding_status: t.onboarding_status,
      subscription: t.billing_subscriptions[0] ?? null,
      payments: t.billing_payments,
      invoices: t.billing_invoices,
    }));
  }
}
