import { Module } from '@nestjs/common';
import { OutstandingController } from './outstanding.controller';
import { OutstandingService } from './outstanding.service';

@Module({
  controllers: [OutstandingController],
  providers: [OutstandingService],
  exports: [OutstandingService],
})
export class OutstandingModule {}
