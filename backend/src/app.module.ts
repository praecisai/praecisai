import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessModule } from './modules/business/business.module';
import { UserModule } from './modules/user/user.module';
import { CustomerModule } from './modules/customer/customer.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { OutstandingModule } from './modules/outstanding/outstanding.module';
import { ImportModule } from './modules/import/import.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { CallingModule } from './modules/calling/calling.module';
import { AiAnalysisModule } from './modules/ai-analysis/ai-analysis.module';
import { PromiseToPayModule } from './modules/promise-to-pay/promise-to-pay.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StorageModule } from './modules/storage/storage.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DemoModule } from './modules/demo/demo.module';
import { PdcModule } from './modules/pdc/pdc.module';
import { HealthModule } from './modules/health/health.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: new Redis(configService.get<string>('redis.url') || 'redis://localhost:6379', {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
        }) as any,
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 10,
          attempts: 2,
          backoff: { type: 'fixed', delay: 5000 },
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    BusinessModule,
    UserModule,
    CustomerModule,
    InvoiceModule,
    OutstandingModule,
    ImportModule,
    CampaignModule,
    WhatsappModule,
    CallingModule,
    AiAnalysisModule,
    PromiseToPayModule,
    DashboardModule,
    StorageModule,
    NotificationModule,
    DemoModule,
    PdcModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: 'api/v1/*path', method: RequestMethod.ALL });
  }
}
