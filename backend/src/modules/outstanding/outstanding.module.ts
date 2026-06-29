import { Module, forwardRef } from '@nestjs/common';
import { OutstandingController } from './outstanding.controller';
import { OutstandingService } from './outstanding.service';
import { PdcModule } from '../pdc/pdc.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PdcModule)],
  controllers: [OutstandingController],
  providers: [OutstandingService],
  exports: [OutstandingService],
})
export class OutstandingModule {}
