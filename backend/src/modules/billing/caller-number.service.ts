import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CallerNumberCheck } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { TenantKeysService } from './tenant-keys.service';
import { toE164India } from '../../common/utils/call-script.util';

const VOBIZ_API = 'https://api.vobiz.ai/api/v1';

/** Vobiz status is re-read at most this often by the dialer (the admin can force it). */
const VOBIZ_STALE_MS = 6 * 60 * 60 * 1000;

/**
 * A customer's last this-many calls from one number, all unanswered, marks that
 * number as "looks blocked" for that customer. Lower than this and an ordinary
 * busy week would trigger it.
 */
const BLOCK_STREAK = 3;
const UNANSWERED = ['NO_ANSWER', 'BUSY'];

/**
 * A business's pool of caller IDs: the primary (bolna_from_number) plus the
 * backups an admin has added, their health, and which one a call should use.
 *
 * Switching rules, deliberately narrow:
 *  - A number Vobiz reports as blocked / not active / voice-disabled is skipped
 *    for everyone until it recovers.
 *  - A number one customer has left unanswered BLOCK_STREAK times in a row is
 *    skipped for that customer only, and that customer is moved to ONE backup,
 *    never cycled through the whole pool: ringing a customer who blocked you
 *    from number after number is exactly what gets CLIs reported.
 *  - Anything unexpected falls back to the primary, i.e. today's behaviour.
 */
@Injectable()
export class CallerNumberService {
  private readonly logger = new Logger(CallerNumberService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private crypto: CryptoService,
    private tenantKeys: TenantKeysService,
  ) {}

  /** Primary first, then backups; E.164, de-duplicated. */
  async pool(businessId: string) {
    const b = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        bolna_from_number: true,
        backup_from_numbers: true,
        vobiz_auth_id: true,
        vobiz_auth_token: true,
      },
    });
    if (!b) throw new NotFoundException('Tenant not found');
    const primary = b.bolna_from_number || this.config.get<string>('BOLNA_FROM_NUMBER') || null;
    const all: string[] = [];
    for (const n of [primary, ...(b.backup_from_numbers ?? [])]) {
      const e = n ? toE164India(n) : '';
      if (e && !all.includes(e)) all.push(e);
    }
    return {
      primary: primary ? toE164India(primary) : null,
      all,
      vobizConnected: !!this.vobizCreds(b),
    };
  }

  /**
   * The business's own Vobiz login when an admin saved one, otherwise the
   * platform's shared login from VOBIZ_AUTH_ID / VOBIZ_AUTH_TOKEN (every
   * business's numbers live on the same Vobiz account today).
   */
  private vobizCreds(b: {
    vobiz_auth_id: string | null;
    vobiz_auth_token: string | null;
  }): { authId: string; token: string } | null {
    if (b.vobiz_auth_id && b.vobiz_auth_token) {
      return { authId: b.vobiz_auth_id, token: this.crypto.decrypt(b.vobiz_auth_token) };
    }
    const authId = this.config.get<string>('VOBIZ_AUTH_ID');
    const token = this.config.get<string>('VOBIZ_AUTH_TOKEN');
    return authId && token ? { authId, token } : null;
  }

  /** Unknown (never checked) counts as usable, so adding Vobiz creds is optional. */
  isUsable(check: CallerNumberCheck | undefined): boolean {
    if (!check?.vobiz_checked_at || check.vobiz_error) return true;
    return (
      check.vobiz_found === true &&
      check.vobiz_status === 'active' &&
      check.vobiz_blocked !== true &&
      check.vobiz_voice_enabled !== false
    );
  }

  /**
   * Caller ID for one production call. `fallback` is what the dialer would have
   * used before this existed; with no backups configured it is returned as is.
   */
  async pickFromNumber(
    businessId: string,
    customerId: string,
    fallback: string,
  ): Promise<{ from: string; reason: string | null }> {
    const { all, vobizConnected } = await this.pool(businessId);
    if (all.length <= 1) return { from: fallback, reason: null };

    let checks = await this.prisma.callerNumberCheck.findMany({ where: { business_id: businessId } });
    const stale = all.some((n) => {
      const c = checks.find((x) => x.phone === n);
      return !c?.vobiz_checked_at || Date.now() - c.vobiz_checked_at.getTime() > VOBIZ_STALE_MS;
    });
    if (vobizConnected && stale) {
      try {
        checks = await this.refreshVobiz(businessId);
      } catch (err: any) {
        // Keep dialing on the last known state; Vobiz being down is not a reason to stop.
        this.logger.warn(`Vobiz status refresh failed for ${businessId}: ${err?.message || err}`);
      }
    }

    const byPhone = new Map(checks.map((c) => [c.phone, c]));
    const healthy = all.filter((n) => this.isUsable(byPhone.get(n)));
    if (healthy.length === 0) return { from: fallback, reason: null };

    const history = await this.prisma.callLog.findMany({
      where: {
        customer_id: customerId,
        from_number: { in: healthy },
        call_status: { not: 'PENDING' },
      },
      orderBy: { created_at: 'desc' },
      take: 30,
      select: { from_number: true, call_status: true },
    });
    const looksBlocked = (n: string) => {
      const recent = history.filter((h) => h.from_number === n).slice(0, BLOCK_STREAK);
      return recent.length === BLOCK_STREAK && recent.every((h) => UNANSWERED.includes(h.call_status));
    };

    const [first, second] = healthy;
    if (!looksBlocked(first)) {
      return {
        from: first,
        reason: first !== all[0] ? `primary ${all[0]} unusable on Vobiz` : null,
      };
    }
    if (second && !looksBlocked(second)) {
      return { from: second, reason: `${first} unanswered ${BLOCK_STREAK}x by this customer` };
    }
    // Both the usual number and its one backup look ignored: stop switching.
    return { from: first, reason: null };
  }

  /** Reads every number on the tenant's Vobiz account and records each pool number's status. */
  async refreshVobiz(businessId: string): Promise<CallerNumberCheck[]> {
    const b = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { vobiz_auth_id: true, vobiz_auth_token: true },
    });
    const creds = b ? this.vobizCreds(b) : null;
    if (!creds) {
      throw new BadRequestException(
        'No Vobiz login: set VOBIZ_AUTH_ID and VOBIZ_AUTH_TOKEN on the server, or add them for this business',
      );
    }
    const { authId, token } = creds;
    const { all } = await this.pool(businessId);

    const found = new Map<string, any>();
    let error: string | null = null;
    try {
      for (let page = 1; page <= 20; page++) {
        const res = await fetch(
          `${VOBIZ_API}/Account/${encodeURIComponent(authId)}/numbers?page=${page}&per_page=100`,
          {
            headers: { 'X-Auth-ID': authId, 'X-Auth-Token': token },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!res.ok) {
          error = `Vobiz ${res.status}: ${(await res.text()).slice(0, 200)}`;
          break;
        }
        const body: any = await res.json();
        const items: any[] = Array.isArray(body?.items) ? body.items : [];
        for (const it of items) if (it?.e164) found.set(toE164India(String(it.e164)), it);
        const total = Number(body?.total) || 0;
        if (items.length === 0 || page * 100 >= total) break;
      }
    } catch (err: any) {
      error = `Vobiz unreachable: ${err?.message || err}`;
    }

    const now = new Date();
    for (const phone of all) {
      const it = found.get(phone);
      const data = error
        ? { vobiz_checked_at: now, vobiz_error: error }
        : {
            vobiz_found: !!it,
            vobiz_status: it?.status ?? null,
            vobiz_blocked: it ? !!it.is_blocked : null,
            vobiz_trial: it ? !!it.is_trial_number : null,
            vobiz_voice_enabled: it ? it.voice_enabled !== false && it.capabilities?.voice !== false : null,
            vobiz_kyc_pending: it ? !!it.aadhaar_verification_required && !it.aadhaar_verified : null,
            vobiz_checked_at: now,
            vobiz_error: null,
          };
      await this.prisma.callerNumberCheck.upsert({
        where: { business_id_phone: { business_id: businessId, phone } },
        create: { business_id: businessId, phone, ...data },
        update: data,
      });
    }
    if (error) throw new BadRequestException(error);
    return this.prisma.callerNumberCheck.findMany({ where: { business_id: businessId } });
  }

  /** Pool + health for the admin panel. */
  async overview(businessId: string) {
    const { primary, all, vobizConnected } = await this.pool(businessId);
    const checks = await this.prisma.callerNumberCheck.findMany({ where: { business_id: businessId } });
    return {
      vobiz_connected: vobizConnected,
      numbers: all.map((phone) => {
        const c = checks.find((x) => x.phone === phone);
        return {
          phone,
          role: phone === primary ? 'PRIMARY' : 'BACKUP',
          usable: this.isUsable(c),
          check: c ?? null,
        };
      }),
    };
  }

  /**
   * Places one real Bolna call from `phone` to `to` (the admin's own mobile) to
   * prove the number can actually dial out through this tenant's Bolna account.
   * Bolna rejecting the request is recorded immediately; the ring/answer result
   * arrives on the normal webhook (recordTestWebhook).
   */
  async testCall(businessId: string, phone: string, to: string) {
    const from = toE164India(phone);
    const dest = toE164India(to);
    const { all } = await this.pool(businessId);
    if (!all.includes(from)) throw new BadRequestException(`${from} is not one of this business's caller numbers`);
    if (!/^\+\d{11,15}$/.test(dest)) throw new BadRequestException('Enter the mobile number to ring, e.g. +919876543210');

    const keys = await this.tenantKeys.getBolnaKeys(businessId);
    if (!keys.apiKey || !keys.agentId) throw new BadRequestException('This business has no Bolna API key / agent id');

    const base = { business_id: businessId, phone };
    const where = { business_id_phone: base };
    try {
      const res = await fetch('https://api.bolna.dev/call', {
        method: 'POST',
        headers: { Authorization: `Bearer ${keys.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: keys.agentId,
          recipient_phone_number: dest,
          from_phone_number: from,
          // Harmless placeholder values for every variable the agent reads.
          user_data: {
            call_log_id: '',
            business_name: 'Test',
            business_city: '',
            customer_name: 'Test',
            due_amount: '1',
            due_amount_hindi: 'ek rupaya',
            days_overdue: '1',
            segment: 'Soft Reminder',
            segment_instructions: 'This is a caller ID test call. Greet briefly and end the call.',
            call_history_summary: '',
            multi_invoice_note: '',
            partial_payment_note: '',
            handoff_number: '',
            greeting_time: 'Namaskar',
            days_mention: '',
            dispute_note: '',
            ptp_window_note: '',
            ptp_window_note_english: '',
            due_amount_english: 'one rupee',
            segment_instructions_english: 'This is a caller ID test call. Greet briefly and end the call.',
            multi_invoice_note_english: '',
            partial_payment_note_english: '',
            days_mention_english: '',
            customer_name_english: 'Test',
            business_city_english: '',
            last_bill_note: '',
            last_bill_note_english: '',
            last_bill_number: '',
          },
          metadata: { caller_number_test: true },
        }),
        signal: AbortSignal.timeout(30000),
      });
      const text = await res.text();
      if (!res.ok) {
        const data = {
          test_to: dest,
          test_execution_id: null,
          test_status: 'rejected',
          test_detail: `Bolna ${res.status}: ${text.slice(0, 300)}`,
          test_at: new Date(),
        };
        await this.prisma.callerNumberCheck.upsert({ where, create: { ...base, ...data }, update: data });
      } else {
        let body: any = {};
        try {
          body = JSON.parse(text);
        } catch {
          // non-JSON success body: keep the id empty
        }
        const execId = body.execution_id || body.run_id || body.call_id || body.id || null;
        const data = {
          test_to: dest,
          test_execution_id: execId,
          test_status: 'dispatched',
          test_detail: 'Bolna accepted the call. Waiting for it to ring.',
          test_at: new Date(),
        };
        await this.prisma.callerNumberCheck.upsert({ where, create: { ...base, ...data }, update: data });
      }
    } catch (err: any) {
      const data = {
        test_to: dest,
        test_execution_id: null,
        test_status: 'error',
        test_detail: `Could not reach Bolna: ${err?.message || err}`,
        test_at: new Date(),
      };
      await this.prisma.callerNumberCheck.upsert({ where, create: { ...base, ...data }, update: data });
    }
    return this.overview(businessId);
  }

  /**
   * Bolna webhook for an admin test call. Returns true when the execution was
   * a test (the caller then skips all customer-call handling).
   */
  async recordTestWebhook(executionId: string, status: string, payload: any): Promise<boolean> {
    const check = await this.prisma.callerNumberCheck.findUnique({
      where: { test_execution_id: executionId },
      select: { id: true },
    });
    if (!check) return false;
    const hangup = payload?.telephony_data?.hangup_reason;
    const s = String(status ?? '').toLowerCase();
    const outcome =
      s === 'completed' || s === 'in-progress' || s === 'call-disconnected'
        ? 'connected'
        : s === 'initiated' || s === 'ringing'
          ? 'ringing'
          : 'failed';
    await this.prisma.callerNumberCheck.update({
      where: { id: check.id },
      data: {
        test_status: outcome,
        test_detail: `Bolna: ${status}${hangup ? ` (${hangup})` : ''}`,
      },
    });
    return true;
  }
}
