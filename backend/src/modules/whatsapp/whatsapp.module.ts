import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappService } from './whatsapp.service';
import { StatementPdfService } from './statement-pdf.service';
import { AisensyService } from './aisensy.service';
import { StatementProcessor } from './queues/statement.processor';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    StorageModule,
    BullModule.registerQueue({
      name: 'whatsapp-statements',
    }),
  ],
  controllers: [WhatsappController, WhatsappWebhookController],
  providers: [WhatsappService, StatementPdfService, AisensyService, StatementProcessor],
  exports: [WhatsappService, StatementPdfService, AisensyService],
})
export class WhatsappModule {}
