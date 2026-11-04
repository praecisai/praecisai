import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  BusinessId,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { isPlatformOwner } from '../../common/constants/platform-owner';
import { PrismaService } from '../../prisma/prisma.service';
import { CALL_RATES_RUPEES, ModelTier, isModelTier } from './credit-packs.util';

class SetCallModelDto {
  @IsIn(['A', 'B', 'C'])
  tier: ModelTier;
}

/**
 * Which AI model (A best, B 2nd best, C 3rd best) this business dials with.
 * Everyone can read it. A customer picks their plan themselves on Billing
 * while they hold no call minutes; once minutes are bought the plan is locked
 * (minutes bought at one plan's rate must not be spent on a pricier plan)
 * until they run out. Platform-owner logins and /admin can always switch.
 */
@Controller('call-model')
@UseGuards(JwtAuthGuard)
export class CallModelController {
  constructor(private prisma: PrismaService) {}

  /** Call minutes left (0 when the business has no credit account yet). */
  private async callBalance(businessId: string): Promise<number> {
    const account = await this.prisma.creditAccount.findUnique({
      where: { business_id: businessId },
      select: { call_credits: true },
    });
    return account?.call_credits ?? 0;
  }

  /** Why this login cannot switch now, or null when it can. */
  private async switchLock(businessId: string, user: any): Promise<string | null> {
    if (isPlatformOwner(user?.email)) return null;
    const minutes = await this.callBalance(businessId);
    if (minutes < 1) return null;
    // Free trial minutes are on us and work on any plan: only minutes that
    // were paid for (or granted by admin) tie the customer to a plan.
    const paidFor = await this.prisma.creditTransaction.findFirst({
      where: {
        business_id: businessId,
        kind: 'CALL',
        reason: { in: ['PURCHASE', 'AUTOPAY', 'ADJUSTMENT'] },
      },
      select: { id: true },
    });
    if (!paidFor) return null;
    return `You have ${Math.round(minutes * 100) / 100} call minutes on your current plan. You can switch plan once they are used up, or ask the PraecisAI team to switch it for you.`;
  }

  @Get()
  async get(@BusinessId() businessId: string, @CurrentUser() user: any) {
    const [business, tiers, lock] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          call_model_tier: true,
          bolna_agent_id: true,
          model_keys: { select: { tier: true, bolna_agent_id: true } },
        },
      }),
      this.prisma.callModelTier.findMany({ orderBy: { tier: 'asc' } }),
      this.switchLock(businessId, user),
    ]);
    const agentFor = (t: string) =>
      t === 'A'
        ? business?.bolna_agent_id
        : business?.model_keys.find((k) => k.tier === t)?.bolna_agent_id;
    return {
      current: isModelTier(business?.call_model_tier)
        ? business!.call_model_tier
        : 'A',
      can_switch: !lock,
      locked_reason: lock,
      tiers: tiers.map((t) => ({
        tier: t.tier,
        label: t.label,
        description: t.description,
        active: t.active,
        // Model A always works (it is the main agent); B/C need their agent
        // id added for this business in /admin first.
        available: t.tier === 'A' || !!agentFor(t.tier),
        rate_from: isModelTier(t.tier)
          ? CALL_RATES_RUPEES[t.tier][CALL_RATES_RUPEES[t.tier].length - 1]
          : null,
        rate_to: isModelTier(t.tier) ? CALL_RATES_RUPEES[t.tier][0] : null,
      })),
    };
  }

  @Patch()
  async set(
    @BusinessId() businessId: string,
    @CurrentUser() user: any,
    @Body() dto: SetCallModelDto,
  ) {
    const lock = await this.switchLock(businessId, user);
    if (lock) throw new ForbiddenException(lock);
    const tier = await this.prisma.callModelTier.findUnique({
      where: { tier: dto.tier },
    });
    if (!tier?.active)
      throw new BadRequestException('That model is switched off in admin');
    if (dto.tier !== 'A') {
      const row = await this.prisma.businessModelKeys.findUnique({
        where: { business_id_tier: { business_id: businessId, tier: dto.tier } },
        select: { bolna_agent_id: true },
      });
      if (!row?.bolna_agent_id) {
        throw new BadRequestException(
          `Add the ${tier.label} agent id for this business in admin first`,
        );
      }
    }
    await this.prisma.business.update({
      where: { id: businessId },
      data: { call_model_tier: dto.tier },
    });
    return this.get(businessId, user);
  }
}
