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
import { AdminService, UpsertTenantDto, UpsertDemoAgentDto, UpdateModelTierDto } from './admin.service';
import { BillingNotificationService } from './billing-notification.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BolnaUsageService } from './bolna-usage.service';
import { CallerNumberService } from './caller-number.service';
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
    private callerNumbers: CallerNumberService,
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
  async updateTenant(@Param('id') id: string, @Body() dto: UpsertTenantDto) {
    const result = await this.admin.updateTenant(id, dto);
    // A changed threshold rewrites the tenant's low-balance banner, which
    // otherwise keeps quoting the old figure until the next 30-minute poll.
    // Best-effort: a Bolna outage must not fail the settings save.
    if (dto.lowBalanceThresholdUsd !== undefined) {
      try {
        await this.bolnaUsage.pollTenant(id);
      } catch {
        // banner catches up on the next scheduled poll
      }
    }
    return result;
  }

  /** Model B / C keys: Bolna key + agent, caller IDs, Vobiz, AiSensy. */
  @Patch('tenants/:id/model-keys/:tier')
  async updateModelKeys(
    @Param('id') id: string,
    @Param('tier') tier: string,
    @Body() dto: UpsertTenantDto,
  ) {
    const result = await this.admin.updateModelKeys(id, tier, dto);
    try {
      await this.bolnaUsage.pollTenant(id);
    } catch {
      // balance banner catches up on the next scheduled poll
    }
    return result;
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string, @Body() body: { confirmName: string }) {
    return this.admin.deleteTenant(id, body?.confirmName ?? '');
  }

  @Post('tenants/:id/offline-payment')
  recordOfflinePayment(
    @Param('id') id: string,
    @Body() body: { plan: string; amount: number; paid_on?: string },
  ) {
    return this.admin.recordOfflinePayment(id, {
      plan: body.plan,
      amountRupees: body.amount,
      paidOn: body.paid_on,
    });
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

  // ─── Caller numbers ─────────────────────────────────────────────────────────

  @Get('tenants/:id/caller-numbers')
  listCallerNumbers(@Param('id') id: string) {
    return this.callerNumbers.overview(id);
  }

  /** Re-read every caller number's status from the tenant's Vobiz account. */
  @Post('tenants/:id/caller-numbers/verify')
  async verifyCallerNumbers(@Param('id') id: string) {
    await this.callerNumbers.refreshVobiz(id);
    return this.callerNumbers.overview(id);
  }

  /** Places one real test call from a caller number to the admin's mobile. */
  @Post('tenants/:id/caller-numbers/test')
  testCallerNumber(@Param('id') id: string, @Body() body: { phone: string; to: string }) {
    return this.callerNumbers.testCall(id, body?.phone ?? '', body?.to ?? '');
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

  // ─── Demo voice agents ────────────────────────────────────────────────────────

  // ─── AI models ──────────────────────────────────────────────────────────────

  @Get('models')
  listModelTiers() {
    return this.admin.listModelTiers();
  }

  @Patch('models/:tier')
  updateModelTier(@Param('tier') tier: string, @Body() dto: UpdateModelTierDto) {
    return this.admin.updateModelTier(tier, dto);
  }

  // ─── Credits ────────────────────────────────────────────────────────────────

  @Post('tenants/:id/credits')
  adjustCredits(@Param('id') id: string, @Body() body: { kind: string; delta: number; note?: string }) {
    return this.admin.adjustCredits(id, body);
  }

  @Get('tenants/:id/credits')
  creditHistory(@Param('id') id: string) {
    return this.admin.creditHistory(id);
  }

  @Get('demo-agents/styles')
  demoAgentStyles() {
    return this.admin.demoAgentStyles();
  }

  @Get('demo-agents')
  listDemoAgents() {
    return this.admin.listDemoAgents();
  }

  @Post('demo-agents')
  createDemoAgent(@Body() dto: UpsertDemoAgentDto) {
    return this.admin.createDemoAgent(dto);
  }

  @Patch('demo-agents/:id')
  updateDemoAgent(@Param('id') id: string, @Body() dto: UpsertDemoAgentDto) {
    return this.admin.updateDemoAgent(id, dto);
  }

  @Delete('demo-agents/:id')
  deleteDemoAgent(@Param('id') id: string) {
    return this.admin.deleteDemoAgent(id);
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
