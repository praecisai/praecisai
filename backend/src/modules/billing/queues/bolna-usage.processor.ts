import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BolnaUsageService } from '../bolna-usage.service';

@Processor('bolna-usage', { concurrency: 1 })
export class BolnaUsageProcessor extends WorkerHost {
  private readonly logger = new Logger(BolnaUsageProcessor.name);

  constructor(private readonly bolnaUsage: BolnaUsageService) {
    super();
  }

  async process(_job: Job): Promise<any> {
    const result = await this.bolnaUsage.pollAll();
    this.logger.log(`Bolna usage poll complete: ${result.polled} tenant(s)`);
    return result;
  }
}
