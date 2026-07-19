import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CallingController } from './calling.controller';
import { CallingService } from './calling.service';
import { CallProcessor } from './queues/call.processor';
import { CallbackProcessor } from './queues/callback.processor';
import { CallExtractionService } from './call-extraction.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    PrismaModule,
    WhatsappModule,
    BillingModule,
    BullModule.registerQueue({
      name: 'outbound-calls',
    }),
    BullModule.registerQueue({
      name: 'callback-redials',
    }),
  ],
  controllers: [CallingController],
  providers: [CallingService, CallProcessor, CallbackProcessor, CallExtractionService],
  exports: [BullModule, CallingService],
})
export class CallingModule {}
