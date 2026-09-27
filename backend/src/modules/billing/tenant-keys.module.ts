import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { TenantKeysService } from './tenant-keys.service';
import { CallerNumberService } from './caller-number.service';

/**
 * Small standalone module so CallingModule / WhatsappModule can resolve
 * per-tenant keys without importing the whole BillingModule (avoids cycles).
 */
@Module({
  providers: [CryptoService, TenantKeysService, CallerNumberService],
  exports: [CryptoService, TenantKeysService, CallerNumberService],
})
export class TenantKeysModule {}
