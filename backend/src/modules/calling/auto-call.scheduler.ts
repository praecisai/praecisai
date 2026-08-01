import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// The two daily bulk windows, in IST (matches callback-slot.util).
export const AUTO_CALL_SLOTS = [
  { key: 'noon', cron: '0 12 * * *', label: '12:00 IST' },
  { key: 'evening', cron: '0 16 * * *', label: '16:00 IST' },
];

const TIMEZONE = 'Asia/Kolkata';

/**
 * Registers the repeatable jobs that drive the unattended 12:00 / 16:00 runs.
 *
 * The schedule lives in Redis, so it survives restarts and fires once per slot
 * no matter how many API instances are running. Registration is idempotent:
 * old schedulers with the same key are replaced, so changing a cron here does
 * not leave a stale duplicate behind.
 *
 * Whether anything is actually dialed is decided per tenant at run time by
 * `auto_calls_enabled`: this only guarantees the check happens.
 */
@Injectable()
export class AutoCallScheduler implements OnModuleInit {
  private readonly logger = new Logger(AutoCallScheduler.name);

  constructor(@InjectQueue('auto-calls') private readonly queue: Queue) {}

  async onModuleInit() {
    try {
      // Drop schedules that are no longer in AUTO_CALL_SLOTS (e.g. a renamed
      // slot), so removing one here removes it in Redis too.
      const known = new Set(AUTO_CALL_SLOTS.map((s) => `auto-call-${s.key}`));
      const existing = await this.queue.getJobSchedulers();
      for (const s of existing) {
        if (s.key && !known.has(s.key)) {
          await this.queue.removeJobScheduler(s.key);
          this.logger.log(`Removed stale auto-call schedule ${s.key}`);
        }
      }

      for (const slot of AUTO_CALL_SLOTS) {
        await this.queue.upsertJobScheduler(
          `auto-call-${slot.key}`,
          { pattern: slot.cron, tz: TIMEZONE },
          {
            name: 'auto-call-run',
            data: { slot: slot.label },
            opts: { removeOnComplete: 20, removeOnFail: 20 },
          },
        );
      }
      this.logger.log(
        `Auto-call schedule registered: ${AUTO_CALL_SLOTS.map((s) => s.label).join(' and ')} (${TIMEZONE})`,
      );
    } catch (err: any) {
      // Never block boot on the scheduler: manual calling must keep working
      // even if Redis is briefly unreachable.
      this.logger.error(`Could not register the auto-call schedule: ${err?.message || err}`);
    }
  }
}
