import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// Per-business hours + weekdays now, so a single job fires at the top of every
// hour across the allowed daytime window and the processor decides which tenants
// are due this hour. 8:00–20:00 IST covers every selectable slot in Settings.
export const AUTO_WHATSAPP_CRON = '0 8-20 * * *';

const TIMEZONE = 'Asia/Kolkata';

/**
 * Registers the repeatable job behind the unattended WhatsApp statement run.
 *
 * Mirrors AutoCallScheduler: the schedule lives in Redis so it survives
 * restarts and fires once per slot regardless of how many API instances are
 * running. Whether anything is actually sent is decided per tenant at run time
 * by `auto_whatsapp_enabled`, and per party by the segment cadence.
 */
@Injectable()
export class AutoWhatsappScheduler implements OnModuleInit {
  private readonly logger = new Logger(AutoWhatsappScheduler.name);

  constructor(@InjectQueue('auto-whatsapp') private readonly queue: Queue) {}

  async onModuleInit() {
    try {
      const known = 'auto-whatsapp-hourly';
      const existing = await this.queue.getJobSchedulers();
      for (const s of existing) {
        if (s.key && s.key !== known) {
          await this.queue.removeJobScheduler(s.key);
          this.logger.log(`Removed stale auto-WhatsApp schedule ${s.key}`);
        }
      }

      await this.queue.upsertJobScheduler(
        known,
        { pattern: AUTO_WHATSAPP_CRON, tz: TIMEZONE },
        {
          name: 'auto-whatsapp-run',
          opts: { removeOnComplete: 30, removeOnFail: 30 },
        },
      );

      this.logger.log(`Auto-WhatsApp schedule registered: hourly 08:00–20:00 (${TIMEZONE})`);
    } catch (err: any) {
      // Never block boot: manual sends must keep working even if Redis is
      // briefly unreachable.
      this.logger.error(`Could not register the auto-WhatsApp schedule: ${err?.message || err}`);
    }
  }
}
