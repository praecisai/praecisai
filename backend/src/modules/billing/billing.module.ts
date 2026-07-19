import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BillingController } from './billing.controller';
import { AdminController, AdminAuthController } from './admin.controller';
import { AdminAuthService } from './admin-auth.service';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { BillingService } from './billing.service';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { RazorpayService } from './razorpay.service';
import { BillingNotificationService } from './billing-notification.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingInvoicePdfService } from './billing-invoice-pdf.service';
import { BillingGateService } from './billing-gate.service';
import { BolnaUsageService } from './bolna-usage.service';
import { BolnaUsageProcessor } from './queues/bolna-usage.processor';
import { TenantKeysModule } from './tenant-keys.module';

const BOLNA_POLL_EVERY_MS = 30 * 60 * 1000; // 30 minutes

@Module({
  imports: [
    TenantKeysModule,
    BullModule.registerQueue({ name: 'bolna-usage' }),
  ],
  controllers: [BillingController, AdminAuthController, AdminController, RazorpayWebhookController],
  providers: [
    BillingService,
    AdminService,
    AdminGuard,
    AdminAuthService,
    RazorpayService,
    BillingNotificationService,
    BillingInvoiceService,
    BillingInvoicePdfService,
    BillingGateService,
    BolnaUsageService,
    BolnaUsageProcessor,
  ],
  exports: [BillingGateService, BillingNotificationService, TenantKeysModule],
})
export class BillingModule implements OnModuleInit {
  private readonly logger = new Logger(BillingModule.name);

  constructor(@InjectQueue('bolna-usage') private readonly queue: Queue) {}

  /** Register the repeatable 30-minute Bolna balance poll (deduped by jobId). */
  async onModuleInit() {
    try {
      await this.queue.add(
        'bolna-usage-poll',
        {},
        {
          repeat: { every: BOLNA_POLL_EVERY_MS },
          jobId: 'bolna-usage-poll',
          removeOnComplete: 5,
          removeOnFail: 5,
        },
      );
      this.logger.log('Bolna usage poll scheduled every 30 minutes');
    } catch (err: any) {
      this.logger.warn(`Could not schedule Bolna usage poll: ${err?.message}`);
    }
  }
}
