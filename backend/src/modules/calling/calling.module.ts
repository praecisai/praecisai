import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CallingController } from './calling.controller';
import { CallingService } from './calling.service';
import { CallProcessor } from './queues/call.processor';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'outbound-calls',
    }),
  ],
  controllers: [CallingController],
  providers: [CallingService, CallProcessor],
  exports: [BullModule, CallingService],
})
export class CallingModule {}
