import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantKeysService } from './tenant-keys.service';
import { BillingNotificationService, BOLNA_TOPUP_URL } from './billing-notification.service';

/**
 * Polls each connected tenant's OWN Bolna account: balance snapshot, per-call
 * cost backfill, low-balance alerting. Praecis never touches this money; the
 * nudges deep-link the client to platform.bolna.ai to top up themselves.
 *
 * Base URL is configurable because Bolna has served both api.bolna.dev and
 * api.bolna.ai: the default matches the endpoints already used in production.
 */
@Injectable()
export class BolnaUsageService {
  private readonly logger = new Logger(BolnaUsageService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private tenantKeys: TenantKeysService,
    private notifications: BillingNotificationService,
  ) {}

  private get baseUrl(): string {
    return this.config.get<string>('BOLNA_API_BASE') || 'https://api.bolna.dev';
  }

  /** Businesses that have their own Bolna key on record (tenant-connected). */
  async connectedTenants() {
    return this.prisma.business.findMany({
      where: { status: 'ACTIVE', bolna_api_key: { not: null } },
      select: { id: true, name: true, low_balance_threshold_usd: true, billing_email: true },
    });
  }

  async pollTenant(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, low_balance_threshold_usd: true, billing_email: true },
    });
    if (!business) return;

    const { apiKey, agentId, fromTenant } = await this.tenantKeys.getBolnaKeys(businessId);
    if (!apiKey || !fromTenant) return; // only poll tenant-owned accounts

    const headers = { Authorization: `Bearer ${apiKey}` };

    // 1. Balance snapshot
    let balanceUsd: number | null = null;
    try {
      const meRes = await fetch(`${this.baseUrl}/me`, { headers });
      if (!meRes.ok) throw new Error(`HTTP ${meRes.status}`);
      const me = await meRes.json();
      balanceUsd = Math.round(Number(me.wallet) || 0) / 100;
    } catch (err: any) {
      this.logger.warn(`Bolna balance poll failed for ${business.name}: ${err?.message}`);
      return;
    }

    await this.prisma.usageSnapshot.create({
      data: { business_id: businessId, source: 'BOLNA', balance: balanceUsd },
    });

    // 2. Per-call cost backfill from recent executions
    if (agentId) {
      try {
        const exRes = await fetch(
          `${this.baseUrl}/v2/agent/${agentId}/executions?page_size=50`,
          { headers },
        );
        if (exRes.ok) {
          const ex = await exRes.json();
          const items: any[] = Array.isArray(ex) ? ex : (ex?.data ?? []);
          for (const item of items) {
            const execId = item?.id ?? item?.execution_id;
            const cost = typeof item?.total_cost === 'number' ? item.total_cost / 100 : null;
            if (!execId || cost === null) continue;
            await this.prisma.callLog.updateMany({
              where: { retell_call_id: execId, business_id: businessId, bolna_cost_usd: null },
              data: { bolna_cost_usd: cost },
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Bolna executions poll failed for ${business.name}: ${err?.message}`);
      }
    }

    // 3. Threshold crossing: alert ONCE per crossing, auto-clear on recovery
    const threshold = business.low_balance_threshold_usd ?? 5;
    if (balanceUsd < threshold) {
      const { created } = await this.notifications.createOnce(
        businessId,
        'BOLNA_LOW',
        `Bolna calling balance is low: $${balanceUsd.toFixed(2)} (threshold $${threshold}). AI calls stop when the balance runs out. Add funds on ${BOLNA_TOPUP_URL} (paid directly to Bolna, not to Praecis).`,
      );
      if (created) {
        await this.notifications.emailNudge(
          business.billing_email,
          'PraecisAI: your Bolna calling balance is low',
          `Hello ${business.name},\n\nYour Bolna balance is $${balanceUsd.toFixed(2)}, below your $${threshold} alert threshold. AI recovery calls will stop when it runs out.\n\nTop up here (paid directly to Bolna): ${BOLNA_TOPUP_URL}\n\nPraecisAI`,
        );
      }
    } else {
      await this.notifications.resolveOpen(businessId, 'BOLNA_LOW');
    }
  }

  async pollAll(): Promise<{ polled: number }> {
    const tenants = await this.connectedTenants();
    for (const t of tenants) {
      try {
        await this.pollTenant(t.id);
      } catch (err: any) {
        this.logger.error(`Bolna poll failed for ${t.name}: ${err?.message}`);
      }
    }
    return { polled: tenants.length };
  }
}
