import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId, CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingNotificationService } from './billing-notification.service';

class CouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

class UsageQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;
}

class VerifyOrderDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsString()
  @IsNotEmpty()
  payment_id: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}

class VerifySubscriptionDto {
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  @IsString()
  @IsNotEmpty()
  payment_id: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}

/**
 * Client-facing billing endpoints (tenant-scoped via JwtAuthGuard).
 * No secret: Razorpay key secret, tenant API keys, encryption key: is ever
 * present in any response here.
 */
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private billing: BillingService,
    private invoices: BillingInvoiceService,
    private notifications: BillingNotificationService,
  ) {}

  /**
   * Paywall probe: is this account entitled to the dashboard?
   * Entitled = allowlisted email, paid onboarding, or active 10-day trial.
   */
  @Get('access')
  access(@BusinessId() businessId: string, @CurrentUser() user: any) {
    return this.billing.access(businessId, user?.email);
  }

  @Post('coupon/validate')
  validateCoupon(@BusinessId() businessId: string, @Body() dto: CouponDto) {
    return this.billing.quoteOnboarding(dto.code, businessId);
  }

  @Post('checkout/trial')
  createTrialCheckout(@BusinessId() businessId: string) {
    return this.billing.createTrialCheckout(businessId);
  }

  /** Browser-side checkout success: verify signature, activate immediately. */
  @Post('checkout/trial/verify')
  verifyTrialCheckout(@BusinessId() businessId: string, @Body() dto: VerifyOrderDto) {
    return this.billing.verifyTrialCheckout(businessId, dto);
  }

  @Post('checkout/onboarding/verify')
  verifyOnboardingCheckout(@BusinessId() businessId: string, @Body() dto: VerifySubscriptionDto) {
    return this.billing.verifyOnboardingCheckout(businessId, dto);
  }

  @Post('checkout/onboarding')
  createOnboardingCheckout(@BusinessId() businessId: string, @Body() dto: CouponDto) {
    return this.billing.createOnboardingCheckout(businessId, dto.code);
  }

  @Get('summary')
  summary(@BusinessId() businessId: string) {
    return this.billing.summary(businessId);
  }

  @Get('usage')
  usage(@BusinessId() businessId: string, @Query() query: UsageQueryDto) {
    return this.billing.monthlyUsage(businessId, query.month);
  }

  @Get('platforms')
  platforms(@BusinessId() businessId: string) {
    return this.billing.platforms(businessId);
  }

  @Get('notifications')
  notifications_(@BusinessId() businessId: string) {
    return this.notifications.listForTenant(businessId);
  }

  @Patch('notifications/:id/read')
  markRead(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.notifications.markRead(id, businessId);
  }

  @Get('invoices')
  listInvoices(@BusinessId() businessId: string) {
    return this.invoices.listForTenant(businessId);
  }

  @Get('invoices/:id/pdf')
  async invoicePdf(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const url = await this.invoices.signedPdfUrl(businessId, id);
    res.json({ success: true, data: { url } });
  }

  // ─── Dev simulator: only usable while Razorpay is in mock mode ────────────

  @Post('dev/simulate-onboarding-paid')
  simulateOnboardingPaid(@BusinessId() businessId: string) {
    return this.billing.simulateOnboardingPaid(businessId);
  }

  @Post('dev/simulate-monthly-charge')
  simulateMonthlyCharge(@BusinessId() businessId: string) {
    return this.billing.simulateMonthlyCharge(businessId);
  }

  @Post('dev/simulate-trial-paid')
  simulateTrialPaid(@BusinessId() businessId: string) {
    return this.billing.simulateTrialPaid(businessId);
  }

  @Post('dev/simulate-mandate-failure')
  simulateMandateFailure(@BusinessId() businessId: string) {
    return this.billing.simulateMandateFailure(businessId);
  }
}
