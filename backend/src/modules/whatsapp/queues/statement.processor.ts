import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WhatsappService } from '../whatsapp.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { isProviderFailure } from '../aisensy.service';
import {
  nextWhatsappRetryAt,
  retryStageLabel,
  MAX_ATTEMPTS,
} from '../../../common/utils/whatsapp-retry.util';

export interface StatementJob {
  businessId: string;
  customerId: string;
  customerName: string;
  /** Ladder position: 1 = the scheduled send, 2 = same-day, 3 = next-day */
  attempt?: number;
  /** ISO time the cycle was originally scheduled for (drives the ladder) */
  originalAt?: string;
}

// Drains bulk statement sends in the background so the HTTP request returns
// instantly. Sequential (concurrency 1): each send does PDF generation +
// storage upload + AiSensy call, and AiSensy needs no parallelism.
//
// Failure handling has two shapes:
//   * Provider (AiSensy/Meta) failures climb the retry ladder: same day +3.5h,
//     then next day at the original time, then give up and let the party roll
//     into the next weekly run. Meta rejects sends often enough that a single
//     bad minute should not cost a party its whole week.
//   * Everything else (no phone, nothing outstanding, No Follow-up segment) is
//     permanent for this cycle: logged and swallowed, never retried.
//
// Pacing: one send every 2s (~30/min). Meta does not publish a per-second cap
// for template sends, but an even trickle is what a human-run account looks
// like; a 500-message burst from a number with no history is what gets a
// sender reported and its quality rating cut. The limiter is worker-wide, so
// manual bulk sends and the automated run share the same pipe.
@Processor('whatsapp-statements', {
  concurrency: 1,
  limiter: { max: 1, duration: 2000 },
  stalledInterval: 60000,
  maxStalledCount: 1,
})
export class StatementProcessor extends WorkerHost {
  private readonly logger = new Logger(StatementProcessor.name);

  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly prisma: PrismaService,
    @InjectQueue('whatsapp-statements') private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<StatementJob>) {
    const { businessId, customerId, customerName } = job.data;
    const attempt = job.data.attempt ?? 1;
    const originalAt = job.data.originalAt ? new Date(job.data.originalAt) : new Date();

    try {
      const res = await this.whatsapp.sendStatementToCustomer(
        businessId,
        customerId,
        undefined,
        { attempt },
      );
      if (attempt > 1) {
        this.logger.log(
          `Statement sent to ${customerName} on ${retryStageLabel(attempt)} (${res.segment})`,
        );
      } else {
        this.logger.log(`Statement sent to ${customerName} (${res.segment})`);
      }
      return res;
    } catch (err: any) {
      // Only provider-side failures are worth retrying
      if (!isProviderFailure(err)) {
        this.logger.warn(`Statement to ${customerName} skipped: ${err.message}`);
        return { success: false, customer: customerName, reason: err.message };
      }

      const retryAt = nextWhatsappRetryAt(attempt, originalAt);
      // Attached by sendStatementToCustomer when it wrote the FAILED log row
      const logId = (err as { whatsappLogId?: string }).whatsappLogId;

      if (!retryAt) {
        this.logger.error(
          `Statement to ${customerName} failed on ${retryStageLabel(attempt)} ` +
            `(attempt ${attempt}/${MAX_ATTEMPTS}); no retries left, rolls to the next scheduled run: ${err.message}`,
        );
        return { success: false, customer: customerName, reason: err.message, retriesExhausted: true };
      }

      await this.queue.add(
        'send-statement',
        {
          businessId,
          customerId,
          customerName,
          attempt: attempt + 1,
          originalAt: originalAt.toISOString(),
        } satisfies StatementJob,
        { delay: Math.max(0, retryAt.getTime() - Date.now()) },
      );

      // Surface the scheduled retry on the failed log so the dashboard can
      // say "retrying at ..." instead of just "failed".
      if (logId) {
        await this.prisma.whatsAppLog
          .update({ where: { id: logId }, data: { next_retry_at: retryAt } })
          .catch(() => undefined);
      }

      this.logger.warn(
        `Statement to ${customerName} failed on ${retryStageLabel(attempt)}; ` +
          `retrying at ${retryAt.toISOString()} (${retryStageLabel(attempt + 1)}): ${err.message}`,
      );
      return { success: false, customer: customerName, reason: err.message, retryAt };
    }
  }
}
