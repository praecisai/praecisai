import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// One daily window, deliberately BEFORE the 12:00 calling slot so a party who
// is also due a call already has the statement PDF in hand when the phone rings.
export const AUTO_WHATSAPP_SLOT = { key: 'morning', cron: '0 10 * * *', label: '10:00 IST' };

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
      const known = `auto-whatsapp-${AUTO_WHATSAPP_SLOT.key}`;
      const existing = await this.queue.getJobSchedulers();
      for (const s of existing) {
        if (s.key && s.key !== known) {
          await this.queue.removeJobScheduler(s.key);
          this.logger.log(`Removed stale auto-WhatsApp schedule ${s.key}`);
        }
      }

      await this.queue.upsertJobScheduler(
        known,
        { pattern: AUTO_WHATSAPP_SLOT.cron, tz: TIMEZONE },
        {
          name: 'auto-whatsapp-run',
          data: { slot: AUTO_WHATSAPP_SLOT.label },
          opts: { removeOnComplete: 20, removeOnFail: 20 },
        },
      );

      this.logger.log(
        `Auto-WhatsApp schedule registered: ${AUTO_WHATSAPP_SLOT.label} (${TIMEZONE})`,
      );
    } catch (err: any) {
      // Never block boot: manual sends must keep working even if Redis is
      // briefly unreachable.
      this.logger.error(`Could not register the auto-WhatsApp schedule: ${err?.message || err}`);
    }
  }
}
