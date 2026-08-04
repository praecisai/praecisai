import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CONTACTABLE_SEGMENTS,
  parseCadenceDays,
  cadenceCutoff,
  dedupeByPhone,
  phoneKey,
} from '../../../common/utils/contact-cadence.util';

/**
 * The unattended WhatsApp statement run (10:00 IST).
 *
 * Unlike the calling run, this is cadence-driven rather than "everyone in the
 * segment, every slot". A party is only messaged once its segment's cadence has
 * elapsed since the last message we sent it — Soft Reminder every 15 days,
 * every other contactable segment every 7 — so a party that sits in Soft
 * Reminder for two months receives four messages, not sixty.
 *
 * Three protections stack on top, all of which exist to keep the tenant's
 * WhatsApp number out of Meta's Yellow/Red quality bands:
 *   1. cadence, above;
 *   2. one message per physical phone number per run, even when several parties
 *      in the ledger share a handset;
 *   3. a per-business daily ceiling, so a first upload of 3,000 parties cannot
 *      blast a brand-new number far past its messaging tier on day one.
 *
 * Actual pacing (the gap between individual sends) is enforced by the
 * `whatsapp-statements` worker's rate limiter, not here.
 */
@Processor('auto-whatsapp', { concurrency: 1 })
export class AutoWhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(AutoWhatsappProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('whatsapp-statements') private readonly statementQueue: Queue,
  ) {
    super();
  }

  async process(_job: Job) {
    // Fires hourly; act only on tenants whose configured hour + weekday match now.
    const nowIst = new Date(Date.now() + 330 * 60000);
    const hour = nowIst.getUTCHours();
    const weekday = nowIst.getUTCDay(); // 0=Sun … 6=Sat
    const slot = `${String(hour).padStart(2, '0')}:00 IST`;

    const businesses = await this.prisma.business.findMany({
      where: {
        auto_whatsapp_enabled: true,
        status: 'ACTIVE',
        auto_whatsapp_hours: { has: hour },
        auto_whatsapp_weekdays: { has: weekday },
      },
      select: { id: true, name: true, whatsapp_cadence_days: true, daily_whatsapp_cap: true },
    });

    if (businesses.length === 0) {
      this.logger.log(`Auto-WhatsApp ${slot}: no business scheduled to message this hour`);
      return { slot, businesses: 0, queued: 0 };
    }

    let totalQueued = 0;

    for (const business of businesses) {
      try {
        const queued = await this.runForBusiness(business, slot);
        totalQueued += queued;
      } catch (err: any) {
        // One bad tenant must never stop the rest of the run.
        this.logger.error(
          `Auto-WhatsApp ${slot}: ${business.name} failed: ${err?.message || err}`,
        );
      }
    }

    this.logger.log(
      `Auto-WhatsApp ${slot} finished: ${totalQueued} statement(s) queued across ${businesses.length} business(es)`,
    );
    return { slot, businesses: businesses.length, queued: totalQueued };
  }

  private async runForBusiness(
    business: {
      id: string;
      name: string;
      whatsapp_cadence_days: unknown;
      daily_whatsapp_cap: number;
    },
    slot: string,
  ): Promise<number> {
    const cadence = parseCadenceDays(business.whatsapp_cadence_days);
    const cap = business.daily_whatsapp_cap > 0 ? business.daily_whatsapp_cap : 200;

    // Everything already sent by this tenant today counts against the ceiling,
    // including manual sends, because Meta counts the number, not the trigger.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await this.prisma.whatsAppLog.count({
      where: { business_id: business.id, created_at: { gte: startOfDay } },
    });

    let budget = cap - sentToday;
    if (budget <= 0) {
      this.logger.warn(
        `Auto-WhatsApp ${slot}: ${business.name} already at its daily cap (${sentToday}/${cap}); nothing queued`,
      );
      return 0;
    }

    // One phone may appear under several parties across DIFFERENT segments, so
    // dedup has to happen across the whole run, not per segment. Segments are
    // walked gentlest first so the softer template wins a shared handset.
    const seenPhones = new Set<string>();
    let queued = 0;

    for (const segment of CONTACTABLE_SEGMENTS) {
      if (budget <= 0) break;

      const days = cadence[segment];
      const cutoff = cadenceCutoff(days);

      const outstandings = await this.prisma.outstanding.findMany({
        where: {
          business_id: business.id,
          status: 'ACTIVE',
          // WhatsApp uses its own segment (whatsapp_segment_rules), independent
          // of the call segment.
          whatsapp_segment: segment,
          // VIPs are never auto-contacted; they are manual-only by design.
          customer: { is_vip: false },
          // A party still settling a cleared cheque is not chased again.
          OR: [{ pdc_cooldown_until: null }, { pdc_cooldown_until: { lte: new Date() } }],
        },
        include: {
          customer: {
            select: {
              id: true,
              customer_name: true,
              phone: true,
              // Most recent message to this party, to apply the cadence.
              whatsapp_logs: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: { created_at: true },
              },
            },
          },
        },
        // Largest exposure first, so when several parties share one handset the
        // biggest outstanding is the one that gets the message.
        orderBy: { total_due: 'desc' },
      });

      const due = outstandings.filter((o) => {
        if (!o.customer?.phone) return false;
        const last = o.customer.whatsapp_logs[0]?.created_at;
        return !last || last < cutoff;
      });

      // Collapse shared handsets within this segment, then drop any number
      // already claimed by an earlier (gentler) segment in this same run.
      const { unique, duplicates } = dedupeByPhone(due, (o) => o.customer?.phone);
      const fresh = unique.filter((o) => {
        const key = phoneKey(o.customer!.phone!);
        if (seenPhones.has(key)) return false;
        seenPhones.add(key);
        return true;
      });

      const batch = fresh.slice(0, budget);
      if (batch.length > 0) {
        await this.statementQueue.addBulk(
          batch.map((o) => ({
            name: 'send-statement',
            data: {
              businessId: business.id,
              customerId: o.customer!.id,
              customerName: o.customer!.customer_name,
            },
          })),
        );
        queued += batch.length;
        budget -= batch.length;
      }

      if (batch.length > 0 || duplicates.length > 0) {
        this.logger.log(
          `Auto-WhatsApp ${slot}: ${business.name} / ${segment} (every ${days}d) ` +
            `queued ${batch.length}, skipped ${duplicates.length} shared-number, ` +
            `${outstandings.length - due.length} within cadence`,
        );
      }
    }

    if (budget <= 0) {
      this.logger.warn(
        `Auto-WhatsApp ${slot}: ${business.name} hit its daily cap of ${cap}; remaining parties roll to tomorrow`,
      );
    }

    return queued;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Auto-WhatsApp run failed (${job?.data?.slot}): ${err?.message}`);
  }
}
