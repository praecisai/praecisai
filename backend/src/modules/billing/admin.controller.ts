import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AdminGuard } from './admin.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminService, UpsertTenantDto } from './admin.service';
import { BillingNotificationService } from './billing-notification.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BolnaUsageService } from './bolna-usage.service';
import { BillingNotificationKind } from '@prisma/client';

class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

/** Unguarded login route: issues the admin token checked by AdminGuard. */
@Controller('admin')
export class AdminAuthController {
  constructor(private adminAuth: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto.username, dto.password);
  }
}

/**
 * Praecis staff panel. Every route requires the credential token from
 * AdminAuthService: fully independent of Supabase, so only the operator with
 * ADMIN_USERNAME/ADMIN_PASSWORD can get in.
 */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private admin: AdminService,
    private notifications: BillingNotificationService,
    private invoices: BillingInvoiceService,
    private bolnaUsage: BolnaUsageService,
  ) {}

  /** Frontend gate probe: reaching here at all means the token is valid. */
  @Get('me')
  me() {
    return { admin: true };
  }

  // ─── Tenants ────────────────────────────────────────────────────────────────

  @Get('tenants')
  listTenants() {
    return this.admin.listTenants();
  }

  @Post('tenants')
  createTenant(@Body() dto: UpsertTenantDto) {
    return this.admin.createTenant(dto);
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.admin.getTenant(id);
  }

  @Patch('tenants/:id')
  updateTenant(@Param('id') id: string, @Body() dto: UpsertTenantDto) {
    return this.admin.updateTenant(id, dto);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string, @Body() body: { confirmName: string }) {
    return this.admin.deleteTenant(id, body?.confirmName ?? '');
  }

  @Patch('tenants/:id/test-call')
  toggleTestCall(@Param('id') id: string, @Body() body: { passed: boolean }) {
    return this.admin.toggleTestCall(id, !!body.passed);
  }

  @Post('tenants/:id/link-users')
  linkUsers(@Param('id') id: string) {
    return this.admin.linkUsers(id);
  }

  /** Manual poll trigger so the admin can refresh a tenant's Bolna balance. */
  @Post('tenants/:id/poll-bolna')
  async pollBolna(@Param('id') id: string) {
    await this.bolnaUsage.pollTenant(id);
    return { success: true };
  }

  // ─── Notifications ──────────────────────────────────────────────────────────

  @Get('notifications')
  listNotifications(
    @Query('tenantId') tenantId?: string,
    @Query('kind') kind?: BillingNotificationKind,
  ) {
    return this.notifications.listAll({ businessId: tenantId, kind });
  }

  @Patch('notifications/:id/read')
  markRead(@Param('id') id: string) {
    return this.notifications.markRead(id);
  }

  // ─── Coupons ────────────────────────────────────────────────────────────────

  @Get('coupons')
  listCoupons() {
    return this.admin.listCoupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: { code: string; percent: number; maxUses?: number; expiresAt?: string }) {
    return this.admin.createCoupon(dto);
  }

  @Patch('coupons/:id/active')
  setCouponActive(@Param('id') id: string, @Body() body: { active: boolean }) {
    return this.admin.setCouponActive(id, !!body.active);
  }

  // ─── Billing ────────────────────────────────────────────────────────────────

  @Get('billing')
  billingOverview() {
    return this.admin.billingOverview();
  }

  @Get('billing/invoices/:id/pdf')
  async invoicePdf(@Param('id') id: string) {
    const url = await this.invoices.signedPdfUrl(null, id);
    return { url };
  }
}
