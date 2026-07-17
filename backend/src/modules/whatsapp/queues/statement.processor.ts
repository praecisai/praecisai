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
@Processor('whatsapp-statements', {
  concurrency: 1,
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
