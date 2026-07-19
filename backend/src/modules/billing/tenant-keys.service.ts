import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { OnboardingStatus } from '@prisma/client';

export interface BolnaKeys {
  apiKey: string | null;
  agentId: string | null;
  /** true when the key came from the tenant record (not the env fallback) */
  fromTenant: boolean;
}

/**
 * Single source of truth for per-tenant third-party credentials.
 *
 * Resolution order: encrypted tenant record first, platform env second. The
 * env fallback keeps existing tenants (Aeromen) working until the one-time
 * key migration script has copied env keys into their tenant record.
 */
@Injectable()
export class TenantKeysService {
  private readonly logger = new Logger(TenantKeysService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private cryptoService: CryptoService,
  ) {}

  async getBolnaKeys(businessId: string): Promise<BolnaKeys> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { bolna_api_key: true, bolna_agent_id: true },
    });
    if (business?.bolna_api_key) {
      return {
        apiKey: this.cryptoService.decrypt(business.bolna_api_key),
        agentId: business.bolna_agent_id ?? this.config.get<string>('BOLNA_AGENT_ID') ?? null,
        fromTenant: true,
      };
    }
    return {
      apiKey: this.config.get<string>('BOLNA_API_KEY') ?? null,
      agentId: this.config.get<string>('BOLNA_AGENT_ID') ?? null,
      fromTenant: false,
    };
  }

  async getAisensyKey(businessId: string): Promise<string | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { aisensy_api_key: true },
    });
    if (business?.aisensy_api_key) return this.cryptoService.decrypt(business.aisensy_api_key);
    return this.config.get<string>('AISENSY_API_KEY') ?? null;
  }

  /**
   * Write-only key storage. Values are encrypted at rest; passing an empty
   * string clears a key. Moves onboarding PENDING → KEYS_ADDED once both
   * Bolna and AiSensy keys are on the record.
   */
  async setKeys(
    businessId: string,
    keys: { bolnaApiKey?: string; bolnaAgentId?: string; aisensyApiKey?: string },
  ) {
    const data: Record<string, string | null> = {};
    if (keys.bolnaApiKey !== undefined) {
      data.bolna_api_key = keys.bolnaApiKey ? this.cryptoService.encrypt(keys.bolnaApiKey) : null;
    }
    if (keys.bolnaAgentId !== undefined) {
      data.bolna_agent_id = keys.bolnaAgentId || null;
    }
    if (keys.aisensyApiKey !== undefined) {
      data.aisensy_api_key = keys.aisensyApiKey
        ? this.cryptoService.encrypt(keys.aisensyApiKey)
        : null;
    }

    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data,
      select: {
        id: true,
        bolna_api_key: true,
        aisensy_api_key: true,
        onboarding_status: true,
      },
    });

    if (
      updated.onboarding_status === OnboardingStatus.PENDING &&
      updated.bolna_api_key &&
      updated.aisensy_api_key
    ) {
      await this.prisma.business.update({
        where: { id: businessId },
        data: { onboarding_status: OnboardingStatus.KEYS_ADDED },
      });
    }

    this.logger.log(`Tenant keys updated for business ${businessId}`);
    return { success: true };
  }

  /** Masked previews for the admin UI: never the full values. */
  async keyPreviews(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { bolna_api_key: true, bolna_agent_id: true, aisensy_api_key: true },
    });
    return {
      bolna_key_last4: this.cryptoService.last4(business?.bolna_api_key),
      bolna_agent_id: business?.bolna_agent_id ?? null,
      aisensy_key_last4: this.cryptoService.last4(business?.aisensy_api_key),
    };
  }
}
