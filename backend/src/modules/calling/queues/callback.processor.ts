import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CallingService } from '../calling.service';
import { PrismaService } from '../../../prisma/prisma.service';

// Fires a scheduled callback re-dial once its delay elapses. The exact slot was
// computed at analysis time (see callback-slot.util); here we just place the
// call, rebuilding fresh context (segment, amounts) as of now. queueCustomerCall
// enforces its own guards (sensitive cooldown, 60-min gap, no outstanding), so a
// customer who paid or was recently rung is safely skipped.
@Processor('callback-redials', { concurrency: 1 })
export class CallbackProcessor extends WorkerHost {
  private readonly logger = new Logger(CallbackProcessor.name);

  constructor(
    private readonly callingService: CallingService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ businessId: string; customerId: string; scheduledFor: string }>) {
    const { businessId, customerId, scheduledFor } = job.data;

    // VIP protection: VIPs never receive automated calls; the user must
    // trigger them manually from the Outstandings dashboard.
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { is_vip: true },
    });
    if (customer?.is_vip) {
      this.logger.log(`Callback re-dial skipped for ${customerId}: customer is VIP (manual calls only)`);
      return;
    }

    this.logger.log(`Firing scheduled callback re-dial for customer ${customerId} (was set for ${scheduledFor})`);
    try {
      await this.callingService.queueCustomerCall(businessId, customerId);
    } catch (err: any) {
      // Expected when the customer paid, has no phone, or is in cooldown: skip quietly.
      this.logger.warn(`Callback re-dial skipped for ${customerId}: ${err?.message || err}`);
    }
  }
}
