import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { DemoLeadRepository } from './demo-lead.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { CallingModule } from '../calling/calling.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'fallback_demo_secret',
      }),
      inject: [ConfigService],
    }),
    CallingModule,
    WhatsappModule,
    StorageModule,
  ],
  controllers: [DemoController],
  providers: [DemoService, DemoLeadRepository],
})
export class DemoModule {}
