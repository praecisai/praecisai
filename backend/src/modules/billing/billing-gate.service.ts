import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_CALL_COST_USD = 0.1;

export interface DispatchGateResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Pre-dispatch gate for a tenant's calling batch:
 * - blocked while the subscription mandate is HALTED (until payment resolves)
 * - blocked when the Bolna balance can't cover the estimated batch cost
 *
 * Fails OPEN when there is no balance data yet (a brand-new tenant with no
 * snapshots should not be silently blocked).
 */
@Injectable()
export class BillingGateService {
  private readonly logger = new Logger(BillingGateService.name);

  constructor(private prisma: PrismaService) {}

  async checkCallDispatch(businessId: string, estimatedCalls: number): Promise<DispatchGateResult> {
    // 1. Mandate health
    const sub = await this.prisma.billingSubscription.findUnique({
      where: { business_id: businessId },
      select: { status: true },
    });
    if (sub?.status === 'HALTED') {
      const reason =
        'Campaigns are paused: the monthly subscription auto-debit failed. Resolve the payment in Billing to resume.';
      this.logger.warn(`Dispatch blocked for ${businessId}: subscription HALTED`);
      return { allowed: false, reason };
    }

    // 2. Bolna balance vs estimated batch cost
    const snapshot = await this.prisma.usageSnapshot.findFirst({
      where: { business_id: businessId, source: 'BOLNA' },
      orderBy: { captured_at: 'desc' },
      select: { balance: true },
    });
    if (!snapshot) return { allowed: true }; // no data yet: fail open

    const recent = await this.prisma.callLog.aggregate({
      where: { business_id: businessId, bolna_cost_usd: { not: null } },
      _avg: { bolna_cost_usd: true },
    });
    const perCall = recent._avg.bolna_cost_usd ?? DEFAULT_CALL_COST_USD;
    const estimated = Math.max(1, estimatedCalls) * perCall;

    if (snapshot.balance < estimated) {
      const reason = `Not enough Bolna balance for this batch: $${snapshot.balance.toFixed(2)} available, ~$${estimated.toFixed(2)} needed for ${estimatedCalls} call(s). Add funds on Bolna to continue.`;
      this.logger.warn(`Dispatch blocked for ${businessId}: ${reason}`);
      return { allowed: false, reason };
    }

    return { allowed: true };
  }
}
