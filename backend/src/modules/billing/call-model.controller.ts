import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
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
 * Everyone can read it. Only the PraecisAI team changes it: in /admin, or a
 * platform-owner login on its OWN business (the AI Model page). Customers,
 * and an owner viewing a customer's dashboard, never switch it here.
 */
@Controller('call-model')
@UseGuards(JwtAuthGuard)
export class CallModelController {
  constructor(private prisma: PrismaService) {}

  /** Why this login cannot switch now, or null when it can. */
  private switchLock(user: any, req: any): string | null {
    if (isPlatformOwner(user?.email) && !req?.actingAsBusiness) return null;
    return 'Your calling plan is set by the PraecisAI team. To change it, contact the PraecisAI team.';
  }

  @Get()
  async get(@BusinessId() businessId: string, @CurrentUser() user: any, @Req() req: any) {
    const lock = this.switchLock(user, req);
    const [business, tiers] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          call_model_tier: true,
          bolna_agent_id: true,
          model_keys: { select: { tier: true, bolna_agent_id: true } },
        },
      }),
      this.prisma.callModelTier.findMany({ orderBy: { tier: 'asc' } }),
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
    @Req() req: any,
  ) {
    const lock = this.switchLock(user, req);
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
    return this.get(businessId, user, req);
  }
}
