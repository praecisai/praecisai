import { Module, forwardRef } from '@nestjs/common';
import { PdcController } from './pdc.controller';
import { PdcService } from './pdc.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OutstandingModule } from '../outstanding/outstanding.module';

@Module({
  imports: [PrismaModule, forwardRef(() => OutstandingModule)],
  controllers: [PdcController],
  providers: [PdcService],
  exports: [PdcService],
})
export class PdcModule {}
