import { Module } from '@nestjs/common'; import { PromiseToPayController } from './promise-to-pay.controller'; import { PromiseToPayService } from './promise-to-pay.service';
@Module({ controllers: [PromiseToPayController], providers: [PromiseToPayService] })
export class PromiseToPayModule {}
