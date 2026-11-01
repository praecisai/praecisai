import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from './credits.service';

export interface DispatchGateResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Pre-dispatch gate for a tenant's calling batch:
 * - blocked while the subscription mandate is HALTED (until payment resolves)
 * - blocked when a credit-billed business has no call minutes left
 *
 * Businesses still on legacy direct billing (credit_billing = false) are only
 * subject to the mandate check.
 */
@Injectable()
export class BillingGateService {
  private readonly logger = new Logger(BillingGateService.name);

  constructor(
    private prisma: PrismaService,
    private credits: CreditsService,
  ) {}

  async checkCallDispatch(businessId: string, estimatedCalls: number): Promise<DispatchGateResult> {
    // 1. Mandate health
    const sub = await this.prisma.billingSubscription.findUnique({
      where: { business_id: businessId },
      select: { status: true },
    });
    if (sub?.status === 'HALTED') {
      const reason =
        'Campaigns are paused: the subscription auto-debit failed. Resolve the payment in Billing to resume.';
      this.logger.warn(`Dispatch blocked for ${businessId}: subscription HALTED`);
      return { allowed: false, reason };
    }

    // 2. Call credits (each call is also checked again right before dialling)
    try {
      await this.credits.assertCanCall(businessId);
    } catch (err: any) {
      this.logger.warn(`Dispatch blocked for ${businessId} (${estimatedCalls} calls): ${err?.message}`);
      return { allowed: false, reason: err?.message };
    }

    return { allowed: true };
  }
}
