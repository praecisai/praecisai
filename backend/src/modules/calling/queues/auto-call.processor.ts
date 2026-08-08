import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CallingService } from '../calling.service';
import { NO_FOLLOWUP_SEGMENT } from '../../../common/utils/segment.util';

// Segments the unattended runs dial, gentlest first. "No Follow-up", "Cleared"
// and "Credit Note" are never contacted, and VIPs are excluded inside
// queueSegmentCalls (they are manual-only by design).
const AUTO_CALL_SEGMENTS = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation'];

/**
 * The unattended calling runs (12:00 and 16:00 IST).
 *
 * A repeatable BullMQ job fires this; Redis de-duplicates the schedule, so it
 * runs ONCE per slot even when several API instances are live. Each tenant is
 * processed only while `auto_calls_enabled` is true, and every per-customer
 * guard still applies downstream (VIP, No Follow-up, PDC/sensitive cooldowns,
 * the same-customer repeat gap, and the billing/balance gate).
 */
@Processor('auto-calls', { concurrency: 1 })
export class AutoCallProcessor extends WorkerHost {
  private readonly logger = new Logger(AutoCallProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly callingService: CallingService,
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
        auto_calls_enabled: true,
        status: 'ACTIVE',
        auto_call_hours: { has: hour },
        auto_call_weekdays: { has: weekday },
      },
      select: { id: true, name: true },
    });

    if (businesses.length === 0) {
      this.logger.log(`Auto-call ${slot}: no business scheduled to call this hour`);
      return { slot, businesses: 0, queued: 0 };
    }

    let totalQueued = 0;
    for (const business of businesses) {
      for (const segment of AUTO_CALL_SEGMENTS) {
        if (segment === NO_FOLLOWUP_SEGMENT) continue; // defensive
        try {
          const res = await this.callingService.queueSegmentCalls(business.id, segment);
          totalQueued += res.queued;
          if (res.queued > 0) {
            this.logger.log(
              `Auto-call ${slot}: ${business.name} / ${segment} queued ${res.queued}`,
            );
          }
        } catch (err: any) {
          // A blocked segment (no balance, halted mandate, nobody eligible)
          // must not stop the remaining segments or tenants.
          this.logger.warn(
            `Auto-call ${slot}: ${business.name} / ${segment} skipped: ${err?.message || err}`,
          );
        }
      }
    }

    this.logger.log(
      `Auto-call ${slot} finished: ${totalQueued} call(s) queued across ${businesses.length} business(es)`,
    );
    return { slot, businesses: businesses.length, queued: totalQueued };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Auto-call run failed (${job?.data?.slot}): ${err?.message}`);
  }
}
