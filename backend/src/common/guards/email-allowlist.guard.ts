import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Entitlement gate on costly/outbound actions (Excel import, AI calls,
 * WhatsApp sends). A request passes when ANY of these hold:
 *  · the email is in allowed_emails (manually onboarded clients)
 *  · the business has paid onboarding (PAID / ACTIVE)
 *  · the business has an unexpired 10-day trial (trial_ends_at in future)
 * A lapsed trial automatically fails here again: access closes by itself.
 *
 * Use AFTER JwtAuthGuard (needs request.user / request.businessId).
 */
@Injectable()
export class EmailAllowlistGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const email: string | undefined = request.user?.email?.toLowerCase();

    if (!email) {
      throw new ForbiddenException('This feature is not enabled for your account yet.');
    }

    const allowed = await this.prisma.allowedEmail.findUnique({
      where: { email },
    });
    if (allowed) return true;

    // Paid or in-trial businesses are entitled without an allowlist row
    if (request.businessId) {
      const business = await this.prisma.business.findUnique({
        where: { id: request.businessId },
        select: { onboarding_status: true, trial_ends_at: true },
      });
      if (
        business?.onboarding_status === 'PAID' ||
        business?.onboarding_status === 'ACTIVE' ||
        (business?.trial_ends_at && business.trial_ends_at > new Date())
      ) {
        return true;
      }
    }

    throw new ForbiddenException(
      'This feature needs an active PraecisAI plan. Choose a plan from your dashboard to continue.',
    );
  }
}
