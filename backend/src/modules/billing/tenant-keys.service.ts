import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { OnboardingStatus } from '@prisma/client';
import { toE164India } from '../../common/utils/call-script.util';

export interface BolnaKeys {
  apiKey: string | null;
  agentId: string | null;
  /** Outbound caller ID (E.164). Null means Bolna dials from its shared pool. */
  fromNumber: string | null;
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
      select: { bolna_api_key: true, bolna_agent_id: true, bolna_from_number: true },
    });
    // The caller ID resolves independently of the API key: a tenant still on
    // the platform's Bolna account can already own the number it dials from.
    const fromNumber =
      business?.bolna_from_number || this.config.get<string>('BOLNA_FROM_NUMBER') || null;
    if (business?.bolna_api_key) {
      return {
        apiKey: this.cryptoService.decrypt(business.bolna_api_key),
        agentId: business.bolna_agent_id ?? this.config.get<string>('BOLNA_AGENT_ID') ?? null,
        fromNumber,
        fromTenant: true,
      };
    }
    return {
      apiKey: this.config.get<string>('BOLNA_API_KEY') ?? null,
      agentId: this.config.get<string>('BOLNA_AGENT_ID') ?? null,
      fromNumber,
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
    keys: {
      bolnaApiKey?: string;
      bolnaAgentId?: string;
      bolnaFromNumber?: string;
      aisensyApiKey?: string;
      backupFromNumbers?: string[];
      vobizAuthId?: string;
      vobizAuthToken?: string;
    },
  ) {
    const data: Record<string, string | string[] | null> = {};
    if (keys.backupFromNumbers !== undefined) {
      const clean: string[] = [];
      for (const n of keys.backupFromNumbers) {
        const e = n?.trim() ? toE164India(n) : '';
        if (e && !clean.includes(e)) clean.push(e);
      }
      data.backup_from_numbers = clean;
    }
    // Caller IDs are never shared between businesses: a number carries one
    // business's Truecaller name and answers callbacks with one agent.
    const claimed = [
      ...(keys.bolnaFromNumber ? [toE164India(keys.bolnaFromNumber)] : []),
      ...((data.backup_from_numbers as string[] | undefined) ?? []),
    ];
    await this.assertNumbersUnclaimed(businessId, claimed);
    if (keys.vobizAuthId !== undefined) {
      data.vobiz_auth_id = keys.vobizAuthId.trim() || null;
    }
    if (keys.vobizAuthToken !== undefined) {
      data.vobiz_auth_token = keys.vobizAuthToken
        ? this.cryptoService.encrypt(keys.vobizAuthToken.trim())
        : null;
    }
    if (keys.bolnaApiKey !== undefined) {
      data.bolna_api_key = keys.bolnaApiKey ? this.cryptoService.encrypt(keys.bolnaApiKey) : null;
    }
    if (keys.bolnaAgentId !== undefined) {
      data.bolna_agent_id = keys.bolnaAgentId || null;
    }
    // Stored E.164: Bolna rejects a bare 10-digit number as a caller ID.
    if (keys.bolnaFromNumber !== undefined) {
      data.bolna_from_number = keys.bolnaFromNumber ? toE164India(keys.bolnaFromNumber) : null;
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

  /** Rejects a caller number that is already the main or a backup number of another business. */
  private async assertNumbersUnclaimed(businessId: string, numbers: string[]) {
    if (numbers.length === 0) return;
    const others = await this.prisma.business.findMany({
      where: {
        id: { not: businessId },
        OR: [
          { bolna_from_number: { in: numbers } },
          { backup_from_numbers: { hasSome: numbers } },
        ],
      },
      select: { name: true, bolna_from_number: true, backup_from_numbers: true },
    });
    for (const other of others) {
      const taken = numbers.find(
        (n) => other.bolna_from_number === n || (other.backup_from_numbers ?? []).includes(n),
      );
      if (taken) {
        throw new BadRequestException(
          `${taken} is already a caller number for ${other.name}. Each number can belong to one business only.`,
        );
      }
    }
  }

  /** Masked previews for the admin UI: never the full values. */
  async keyPreviews(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        bolna_api_key: true,
        bolna_agent_id: true,
        bolna_from_number: true,
        aisensy_api_key: true,
        backup_from_numbers: true,
        vobiz_auth_id: true,
        vobiz_auth_token: true,
      },
    });
    return {
      backup_from_numbers: business?.backup_from_numbers ?? [],
      // Auth ID is an account identifier, not a secret; the token is.
      vobiz_auth_id: business?.vobiz_auth_id ?? null,
      vobiz_token_last4: this.cryptoService.last4(business?.vobiz_auth_token),
      bolna_key_last4: this.cryptoService.last4(business?.bolna_api_key),
      bolna_agent_id: business?.bolna_agent_id ?? null,
      // Not a secret: shown in full so the admin can confirm the caller ID.
      bolna_from_number: business?.bolna_from_number ?? null,
      aisensy_key_last4: this.cryptoService.last4(business?.aisensy_api_key),
    };
  }
}
