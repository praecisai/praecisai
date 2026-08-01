import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WhatsappService } from '../whatsapp.service';

// Drains bulk statement sends in the background so the HTTP request returns
// instantly. Sequential (concurrency 1): each send does PDF generation +
// storage upload + AiSensy call, and AiSensy needs no parallelism.
// Failures are per-customer: sendStatementToCustomer already writes a FAILED
// WhatsAppLog for AiSensy errors; we log and swallow so one bad customer
// never stalls the rest of the segment.
// Pacing: one send every 2s (~30/min). Meta does not publish a per-second cap
// for template sends, but an even trickle is what a human-run account looks
// like; a 500-message burst from a number with no history is what gets a
// sender reported and its quality rating cut. The limiter is worker-wide, so
// manual bulk sends and the 10:00 automated run share the same pipe.
@Processor('whatsapp-statements', {
  concurrency: 1,
  limiter: { max: 1, duration: 2000 },
  stalledInterval: 60000,
  maxStalledCount: 1,
})
export class StatementProcessor extends WorkerHost {
  private readonly logger = new Logger(StatementProcessor.name);

  constructor(private readonly whatsapp: WhatsappService) {
    super();
  }

  async process(job: Job<{ businessId: string; customerId: string; customerName: string }>) {
    const { businessId, customerId, customerName } = job.data;
    try {
      const res = await this.whatsapp.sendStatementToCustomer(businessId, customerId);
      this.logger.log(`Statement sent to ${customerName} (${res.segment})`);
      return res;
    } catch (err: any) {
      this.logger.warn(`Statement to ${customerName} skipped/failed: ${err.message}`);
      return { success: false, customer: customerName, reason: err.message };
    }
  }
}
