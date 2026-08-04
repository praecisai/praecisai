import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// The runs are now per-business (chosen hours + weekdays), so a single job fires
// at the top of every hour across the allowed daytime window and the processor
// decides which businesses are due this hour. 8:00–20:00 IST covers every
// selectable slot in Settings.
export const AUTO_CALL_CRON = '0 8-20 * * *';
const TIMEZONE = 'Asia/Kolkata';

/**
 * Registers the hourly job behind the unattended calling runs.
 *
 * The schedule lives in Redis so it survives restarts and fires once per hour
 * regardless of how many API instances are running. Which businesses are dialed
 * is decided in the processor by each tenant's `auto_call_hours` /
 * `auto_call_weekdays` (and `auto_calls_enabled`).
 */
@Injectable()
export class AutoCallScheduler implements OnModuleInit {
  private readonly logger = new Logger(AutoCallScheduler.name);

  constructor(@InjectQueue('auto-calls') private readonly queue: Queue) {}

  async onModuleInit() {
    try {
      // Drop any older per-slot schedulers (auto-call-noon / -evening) so the
      // switch to the hourly job doesn't leave stale duplicates behind.
      const known = 'auto-call-hourly';
      const existing = await this.queue.getJobSchedulers();
      for (const s of existing) {
        if (s.key && s.key !== known) {
          await this.queue.removeJobScheduler(s.key);
          this.logger.log(`Removed stale auto-call schedule ${s.key}`);
        }
      }

      await this.queue.upsertJobScheduler(
        known,
        { pattern: AUTO_CALL_CRON, tz: TIMEZONE },
        {
          name: 'auto-call-run',
          opts: { removeOnComplete: 30, removeOnFail: 30 },
        },
      );
      this.logger.log(`Auto-call schedule registered: hourly 08:00–20:00 (${TIMEZONE})`);
    } catch (err: any) {
      // Never block boot on the scheduler: manual calling must keep working
      // even if Redis is briefly unreachable.
      this.logger.error(`Could not register the auto-call schedule: ${err?.message || err}`);
    }
  }
}
