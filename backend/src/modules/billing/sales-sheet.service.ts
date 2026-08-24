import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { paiseToRupeeString, trialDaysForAmount } from './billing-math.util';

/**
 * Appends one row per successful payment to a Google Sheet, via an Apps Script
 * web app the tenant owns (SALES_SHEET_WEBHOOK_URL). No Google Cloud project,
 * service account or key file is involved: the script runs as the sheet's owner
 * and we authenticate with a shared secret in the payload.
 *
 * Nothing here is allowed to break a payment. Every failure is swallowed and
 * logged: a sheet that missed a row is an annoyance, a payment verification
 * that 500s because Google was slow is a lost customer.
 */
@Injectable()
export class SalesSheetService {
  private readonly logger = new Logger(SalesSheetService.name);
  private static readonly TIMEOUT_MS = 10_000;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /** Human label for what was bought, from the payment type + amount paid. */
  private planLabel(type: string, totalPaise: number): string {
    if (type === 'TRIAL') return `${trialDaysForAmount(totalPaise)}-day trial`;
    if (type === 'ONBOARDING') return 'Full onboarding (includes first month)';
    if (type === 'SUBSCRIPTION') return 'Monthly subscription';
    return type;
  }

  /**
   * Fire-and-forget: callers should NOT await this. Returns nothing and throws
   * nothing.
   */
  logPayment(paymentId: string): void {
    void this.append(paymentId).catch((err) =>
      this.logger.warn(`Sales sheet append failed for payment ${paymentId}: ${err?.message}`),
    );
  }

  private async append(paymentId: string): Promise<void> {
    const url = this.config.get<string>('SALES_SHEET_WEBHOOK_URL');
    if (!url) return; // Not configured: silently no-op, this is optional plumbing

    const payment = await this.prisma.billingPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        type: true,
        total_amount: true,
        paid_at: true,
        razorpay_payment_id: true,
        business: {
          select: {
            id: true,
            name: true,
            billing_email: true,
            gstin: true,
            users: {
              where: { role: 'BUSINESS_OWNER' },
              orderBy: { created_at: 'asc' },
              take: 1,
              select: { email: true, phone: true },
            },
          },
        },
      },
    });
    if (!payment) return;

    const owner = payment.business.users[0];
    const row = {
      // IST, because everyone reading this sheet is in India
      paid_at: (payment.paid_at ?? new Date()).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      }),
      business_name: payment.business.name,
      // The owner login is the buyer; billing_email is only a billing contact
      email: owner?.email ?? payment.business.billing_email ?? '',
      phone: owner?.phone ?? '',
      plan: this.planLabel(payment.type, payment.total_amount),
      // Rupees, not paise: the sheet is read by humans
      amount: paiseToRupeeString(payment.total_amount),
      amount_paise: payment.total_amount,
      payment_type: payment.type,
      gstin: payment.business.gstin ?? '',
      razorpay_payment_id: payment.razorpay_payment_id ?? '',
      business_id: payment.business.id,
      // The script drops a replayed row instead of duplicating it
      payment_record_id: payment.id,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SalesSheetService.TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: this.config.get<string>('SALES_SHEET_WEBHOOK_SECRET') ?? '',
          row,
        }),
        signal: controller.signal,
        // Apps Script answers a web-app POST with a 302 to script.googleusercontent.com
        redirect: 'follow',
      });
      if (!res.ok) {
        this.logger.warn(`Sales sheet webhook returned ${res.status} for payment ${paymentId}`);
        return;
      }
      this.logger.log(`Sales sheet row appended for ${row.business_name} (${row.plan})`);
    } finally {
      clearTimeout(timer);
    }
  }
}
