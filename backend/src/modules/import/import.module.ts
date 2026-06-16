import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { OutstandingModule } from '../outstanding/outstanding.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [OutstandingModule, StorageModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
