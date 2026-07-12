import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappService } from './whatsapp.service';
import { StatementPdfService } from './statement-pdf.service';
import { AisensyService } from './aisensy.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [WhatsappController, WhatsappWebhookController],
  providers: [WhatsappService, StatementPdfService, AisensyService],
  exports: [WhatsappService, StatementPdfService, AisensyService],
})
export class WhatsappModule {}
