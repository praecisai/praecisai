import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappService } from './whatsapp.service';
import { StatementPdfService } from './statement-pdf.service';
import { AisensyService } from './aisensy.service';
import { StatementProcessor } from './queues/statement.processor';
import { AutoWhatsappProcessor } from './queues/auto-whatsapp.processor';
import { AutoWhatsappScheduler } from './auto-whatsapp.scheduler';
import { StorageModule } from '../storage/storage.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    StorageModule,
    BillingModule,
    BullModule.registerQueue({
      name: 'whatsapp-statements',
    }),
    BullModule.registerQueue({
      name: 'auto-whatsapp',
    }),
  ],
  controllers: [WhatsappController, WhatsappWebhookController],
  providers: [
    WhatsappService,
    StatementPdfService,
    AisensyService,
    StatementProcessor,
    AutoWhatsappProcessor,
    AutoWhatsappScheduler,
  ],
  exports: [WhatsappService, StatementPdfService, AisensyService],
})
export class WhatsappModule {}
