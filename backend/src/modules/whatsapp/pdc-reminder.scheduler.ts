import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// Fires at the top of every hour in the selectable window; the processor picks
// the tenants whose first configured WhatsApp slot is this hour.
export const PDC_REMINDER_CRON = '0 8-20 * * *';

const TIMEZONE = 'Asia/Kolkata';

/**
 * Registers the repeatable job behind the PDC cheque-due reminder.
 *
 * Kept separate from the statement run on purpose: a business can want cheque
 * courtesy reminders without switching on the automatic statement blast, and
 * the reminder must go out on the day it is due even if that weekday is not a
 * statement day.
 */
@Injectable()
export class PdcReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(PdcReminderScheduler.name);

  constructor(@InjectQueue('pdc-reminders') private readonly queue: Queue) {}

  async onModuleInit() {
    try {
      const known = 'pdc-reminder-hourly';
      const existing = await this.queue.getJobSchedulers();
      for (const s of existing) {
        if (s.key && s.key !== known) {
          await this.queue.removeJobScheduler(s.key);
          this.logger.log(`Removed stale PDC reminder schedule ${s.key}`);
        }
      }

      await this.queue.upsertJobScheduler(
        known,
        { pattern: PDC_REMINDER_CRON, tz: TIMEZONE },
        {
          name: 'pdc-reminder-run',
          opts: { removeOnComplete: 30, removeOnFail: 30 },
        },
      );

      this.logger.log(`PDC reminder schedule registered: hourly 08:00-20:00 (${TIMEZONE})`);
    } catch (err: any) {
      // Never block boot: the rest of WhatsApp must keep working if Redis is
      // briefly unreachable.
      this.logger.error(`Could not register the PDC reminder schedule: ${err?.message || err}`);
    }
  }
}
