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
 * Everyone can read it; only platform-owner logins (praecisai@gmail.com) can
 * switch it from the dashboard. Customers' models are set in /admin.
 */
@Controller('call-model')
@UseGuards(JwtAuthGuard)
export class CallModelController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async get(@BusinessId() businessId: string, @CurrentUser() user: any) {
    const [business, tiers] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          call_model_tier: true,
          bolna_agent_id: true,
          bolna_agent_id_b: true,
          bolna_agent_id_c: true,
        },
      }),
      this.prisma.callModelTier.findMany({ orderBy: { tier: 'asc' } }),
    ]);
    const agentFor = (t: string) =>
      t === 'B'
        ? business?.bolna_agent_id_b
        : t === 'C'
          ? business?.bolna_agent_id_c
          : business?.bolna_agent_id;
    return {
      current: isModelTier(business?.call_model_tier)
        ? business!.call_model_tier
        : 'A',
      can_switch: isPlatformOwner(user?.email),
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
    if (!isPlatformOwner(user?.email)) {
      throw new ForbiddenException(
        'Only the PraecisAI team can switch the AI model',
      );
    }
    const tier = await this.prisma.callModelTier.findUnique({
      where: { tier: dto.tier },
    });
    if (!tier?.active)
      throw new BadRequestException('That model is switched off in admin');
    if (dto.tier !== 'A') {
      const b = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { bolna_agent_id_b: true, bolna_agent_id_c: true },
      });
      const agent =
        dto.tier === 'B' ? b?.bolna_agent_id_b : b?.bolna_agent_id_c;
      if (!agent) {
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
