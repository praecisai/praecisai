import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CallingController } from './calling.controller';
import { CallingService } from './calling.service';
import { CallProcessor } from './queues/call.processor';
import { CallExtractionService } from './call-extraction.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'outbound-calls',
    }),
  ],
  controllers: [CallingController],
  providers: [CallingService, CallProcessor, CallExtractionService],
  exports: [BullModule, CallingService],
})
export class CallingModule {}
