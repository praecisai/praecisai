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

/** The connection fields a model carries (stored encrypted where secret). */
export interface RawKeys {
  bolna_api_key: string | null;
  bolna_agent_id: string | null;
  bolna_from_number: string | null;
  backup_from_numbers: string[];
  vobiz_auth_id: string | null;
  vobiz_auth_token: string | null;
  aisensy_api_key: string | null;
}

export type KeyTier = 'A' | 'B' | 'C';

export interface EffectiveKeys extends RawKeys {
  tier: KeyTier;
  /** The model dials on a Bolna account of its own, not model A's. */
  ownBolnaAccount: boolean;
}

export const RAW_KEY_SELECT = {
  bolna_api_key: true,
  bolna_agent_id: true,
  bolna_from_number: true,
  backup_from_numbers: true,
  vobiz_auth_id: true,
  vobiz_auth_token: true,
  aisensy_api_key: true,
} as const;

/**
 * Model A's keys live on the business record, B's and C's in
 * business_model_keys. A model with no agent id is not set up for calling, so
 * calls use model A's Bolna settings (switching to a half-configured model
 * never stops calls). A set-up model on model A's Bolna account (no key of its
 * own) borrows any caller ID / backups it leaves empty; one on its own account
 * uses only its own numbers, since a caller ID works only with its account's
 * key. The Vobiz login and AiSensy key each fall back to model A's when empty.
 */
export function mergeModelKeys(
  tier: string | null | undefined,
  a: RawKeys,
  rows: Array<RawKeys & { tier: string }>,
): EffectiveKeys {
  const t: KeyTier = tier === 'B' || tier === 'C' ? tier : 'A';
  const row = t === 'A' ? undefined : rows.find((r) => r.tier === t);
  const vobiz =
    row?.vobiz_auth_id && row.vobiz_auth_token
      ? { vobiz_auth_id: row.vobiz_auth_id, vobiz_auth_token: row.vobiz_auth_token }
      : { vobiz_auth_id: a.vobiz_auth_id, vobiz_auth_token: a.vobiz_auth_token };
  const aisensy_api_key = row?.aisensy_api_key || a.aisensy_api_key;

  if (!row?.bolna_agent_id) {
    return {
      bolna_api_key: a.bolna_api_key,
      bolna_agent_id: a.bolna_agent_id,
      bolna_from_number: a.bolna_from_number,
      backup_from_numbers: a.backup_from_numbers ?? [],
      ...vobiz,
      aisensy_api_key,
      tier: t,
      ownBolnaAccount: false,
    };
  }
  const own = !!row.bolna_api_key;
  return {
    tier: t,
    ownBolnaAccount: own,
    bolna_api_key: row.bolna_api_key || a.bolna_api_key,
    bolna_agent_id: row.bolna_agent_id,
    bolna_from_number: own ? row.bolna_from_number : row.bolna_from_number || a.bolna_from_number,
    backup_from_numbers: own
      ? (row.backup_from_numbers ?? [])
      : row.backup_from_numbers?.length
        ? row.backup_from_numbers
        : (a.backup_from_numbers ?? []),
    ...vobiz,
    aisensy_api_key,
  };
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

  /** Encrypted keys of the model this business dials with now (null: no such business). */
  async effectiveKeys(businessId: string): Promise<EffectiveKeys | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        ...RAW_KEY_SELECT,
        call_model_tier: true,
        model_keys: { select: { tier: true, ...RAW_KEY_SELECT } },
      },
    });
    if (!business) return null;
    return mergeModelKeys(business.call_model_tier, business, business.model_keys);
  }

  async getBolnaKeys(businessId: string): Promise<BolnaKeys> {
    const keys = await this.effectiveKeys(businessId);
    // The caller ID resolves independently of the API key: a tenant still on
    // the platform's Bolna account can already own the number it dials from.
    // The platform's env number never goes out on a model's own Bolna account.
    const fromNumber =
      keys?.bolna_from_number ||
      (keys?.ownBolnaAccount ? null : this.config.get<string>('BOLNA_FROM_NUMBER')) ||
      null;
    if (keys?.bolna_api_key) {
      return {
        apiKey: this.cryptoService.decrypt(keys.bolna_api_key),
        agentId: keys.bolna_agent_id || this.config.get<string>('BOLNA_AGENT_ID') || null,
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
    const keys = await this.effectiveKeys(businessId);
    if (keys?.aisensy_api_key) return this.cryptoService.decrypt(keys.aisensy_api_key);
    return this.config.get<string>('AISENSY_API_KEY') ?? null;
  }

  /**
   * The tenant's OWN AiSensy key, for real sends. No env fallback: the
   * platform key belongs to another tenant's WhatsApp number, so a business
   * without its key must fail instead of messaging from someone else's number.
   */
  async requireAisensyKey(businessId: string): Promise<string> {
    const keys = await this.effectiveKeys(businessId);
    if (keys?.aisensy_api_key) return this.cryptoService.decrypt(keys.aisensy_api_key);
    throw new BadRequestException(
      'WhatsApp is not set up for this business yet: add its AiSensy API key in admin.',
    );
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
    // A = the business record; B / C = that model's row in business_model_keys
    tier: KeyTier = 'A',
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

    if (tier !== 'A') {
      await this.prisma.businessModelKeys.upsert({
        where: { business_id_tier: { business_id: businessId, tier } },
        create: { business_id: businessId, tier, ...data },
        update: data,
      });
      this.logger.log(`Model ${tier} keys updated for business ${businessId}`);
      return { success: true };
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
    // Models B / C of other businesses own their numbers too
    const otherModels = await this.prisma.businessModelKeys.findMany({
      where: {
        business_id: { not: businessId },
        OR: [
          { bolna_from_number: { in: numbers } },
          { backup_from_numbers: { hasSome: numbers } },
        ],
      },
      select: {
        bolna_from_number: true,
        backup_from_numbers: true,
        business: { select: { name: true } },
      },
    });
    for (const m of otherModels) {
      others.push({
        name: m.business.name,
        bolna_from_number: m.bolna_from_number,
        backup_from_numbers: m.backup_from_numbers,
      });
    }
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
      select: { ...RAW_KEY_SELECT, model_keys: { select: { tier: true, ...RAW_KEY_SELECT } } },
    });
    const preview = (k: Partial<RawKeys> | null | undefined) => ({
      backup_from_numbers: k?.backup_from_numbers ?? [],
      // Auth ID is an account identifier, not a secret; the token is.
      vobiz_auth_id: k?.vobiz_auth_id ?? null,
      vobiz_token_last4: this.cryptoService.last4(k?.vobiz_auth_token),
      bolna_key_last4: this.cryptoService.last4(k?.bolna_api_key),
      bolna_agent_id: k?.bolna_agent_id ?? null,
      // Not a secret: shown in full so the admin can confirm the caller ID.
      bolna_from_number: k?.bolna_from_number ?? null,
      aisensy_key_last4: this.cryptoService.last4(k?.aisensy_api_key),
    });
    const row = (t: string) => business?.model_keys.find((m) => m.tier === t);
    return {
      ...preview(business),
      // Models B and C: their own settings (empty = falls back to model A's)
      models: { B: preview(row('B')), C: preview(row('C')) },
    };
  }
}
