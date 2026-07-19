import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prisma, BillingPayment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingInvoicePdfService, InvoiceLineItem } from './billing-invoice-pdf.service';
import { financialYearCode } from './billing-math.util';

const BUCKET = 'billing-invoices';

/**
 * GST invoices for Praecis fees. Numbers are sequential inside each Indian
 * financial year: PRAE/25-26/0001. PDFs live in the private
 * `billing-invoices` bucket; downloads go through short-lived signed URLs.
 */
@Injectable()
export class BillingInvoiceService {
  private readonly logger = new Logger(BillingInvoiceService.name);
  private _supabase: SupabaseClient | null = null;
  private bucketEnsured = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private pdf: BillingInvoicePdfService,
  ) {}

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      this._supabase = createClient(
        this.config.get<string>('SUPABASE_URL')!,
        this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      );
    }
    return this._supabase;
  }

  private async ensureBucket() {
    if (this.bucketEnsured) return;
    try {
      const { data } = await this.supabase.storage.getBucket(BUCKET);
      if (!data) await this.supabase.storage.createBucket(BUCKET, { public: false });
    } catch {
      try {
        await this.supabase.storage.createBucket(BUCKET, { public: false });
      } catch {
        // bucket probably exists already; upload will surface real errors
      }
    }
    this.bucketEnsured = true;
  }

  /**
   * Next sequential number for the FY, allocated inside the insert with a
   * retry on unique collision (two webhooks landing at once).
   */
  private async nextInvoiceNumber(tx: Prisma.TransactionClient, date: Date): Promise<string> {
    const fy = financialYearCode(date);
    const prefix = `PRAE/${fy}/`;
    const last = await tx.billingInvoice.findFirst({
      where: { invoice_number: { startsWith: prefix } },
      orderBy: { invoice_number: 'desc' },
      select: { invoice_number: true },
    });
    const lastSeq = last ? parseInt(last.invoice_number.slice(prefix.length), 10) || 0 : 0;
    return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
  }

  /**
   * Create the invoice row + PDF for a PAID BillingPayment. Idempotent: an
   * existing invoice for the payment is returned untouched.
   */
  async createForPayment(payment: BillingPayment): Promise<{ id: string; invoice_number: string }> {
    const existing = await this.prisma.billingInvoice.findUnique({
      where: { payment_id: payment.id },
    });
    if (existing) return existing;

    const business = await this.prisma.business.findUnique({
      where: { id: payment.business_id },
      select: { name: true, gstin: true, billing_email: true },
    });
    if (!business) throw new NotFoundException('Business not found for invoice');

    const lineItems: InvoiceLineItem[] =
      payment.type === 'ONBOARDING'
        ? [
            {
              description: 'One-time onboarding and setup fee',
              amount: payment.setup_component,
            },
            {
              description: 'First month subscription (included in onboarding)',
              amount: payment.subscription_component,
            },
            ...(payment.discount_amount > 0
              ? [
                  {
                    description: `Coupon discount applied: Rs.${(payment.discount_amount / 100).toLocaleString('en-IN')} off Rs.${(payment.base_amount / 100).toLocaleString('en-IN')} base`,
                    amount: 0,
                  },
                ]
              : []),
          ]
        : payment.type === 'TRIAL'
          ? [
              {
                description: 'PraecisAI 1-week trial: full platform access for 7 days',
                amount: payment.base_amount,
              },
            ]
          : [
              {
                description: 'PraecisAI monthly subscription',
                amount: payment.subscription_component || payment.base_amount,
              },
            ];

    const taxableValue = payment.total_amount - payment.gst_amount;
    const now = payment.paid_at ?? new Date();

    // Allocate number + insert with up to 3 retries on a concurrent collision
    let invoice: { id: string; invoice_number: string } | null = null;
    for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
      try {
        invoice = await this.prisma.$transaction(async (tx) => {
          const invoiceNumber = await this.nextInvoiceNumber(tx, now);
          return tx.billingInvoice.create({
            data: {
              business_id: payment.business_id,
              payment_id: payment.id,
              invoice_number: invoiceNumber,
              line_items: lineItems as unknown as Prisma.InputJsonValue,
              taxable_value: taxableValue,
              gst: payment.gst_amount,
              total: payment.total_amount,
            },
            select: { id: true, invoice_number: true },
          });
        });
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
        this.logger.warn('Invoice number collision: retrying');
      }
    }
    if (!invoice) throw new BadRequestException('Could not allocate invoice number');

    // Render + upload the PDF (failure leaves the row; PDF can be re-rendered)
    try {
      const buffer = await this.pdf.generate({
        invoiceNumber: invoice.invoice_number,
        invoiceDate: now,
        billTo: { name: business.name, gstin: business.gstin, email: business.billing_email },
        lineItems,
        taxableValue,
        gst: payment.gst_amount,
        total: payment.total_amount,
      });
      await this.ensureBucket();
      const key = `${payment.business_id}/${invoice.invoice_number.replace(/\//g, '-')}.pdf`;
      const { error } = await this.supabase.storage
        .from(BUCKET)
        .upload(key, buffer, { contentType: 'application/pdf', upsert: true });
      if (error) throw new Error(error.message);
      await this.prisma.billingInvoice.update({
        where: { id: invoice.id },
        data: { pdf_url: key },
      });
    } catch (err: any) {
      this.logger.error(`Invoice PDF upload failed for ${invoice.invoice_number}: ${err?.message}`);
    }

    this.logger.log(`Invoice ${invoice.invoice_number} created for payment ${payment.id}`);
    return invoice;
  }

  async listForTenant(businessId: string) {
    return this.prisma.billingInvoice.findMany({
      where: { business_id: businessId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        invoice_number: true,
        taxable_value: true,
        gst: true,
        total: true,
        pdf_url: true,
        created_at: true,
        payment: { select: { type: true, paid_at: true } },
      },
    });
  }

  /** Short-lived signed URL for a tenant's own invoice PDF. */
  async signedPdfUrl(businessId: string | null, invoiceId: string): Promise<string> {
    const invoice = await this.prisma.billingInvoice.findFirst({
      where: { id: invoiceId, ...(businessId ? { business_id: businessId } : {}) },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.pdf_url) {
      // PDF was never uploaded (e.g. storage hiccup): re-render for the SAME
      // invoice row so the number never changes
      const business = await this.prisma.business.findUnique({
        where: { id: invoice.business_id },
        select: { name: true, gstin: true, billing_email: true },
      });
      const buffer = await this.pdf.generate({
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.created_at,
        billTo: {
          name: business?.name ?? 'Client',
          gstin: business?.gstin,
          email: business?.billing_email,
        },
        lineItems: (invoice.line_items as unknown as InvoiceLineItem[]) ?? [],
        taxableValue: invoice.taxable_value,
        gst: invoice.gst,
        total: invoice.total,
      });
      await this.ensureBucket();
      const key = `${invoice.business_id}/${invoice.invoice_number.replace(/\//g, '-')}.pdf`;
      const { error } = await this.supabase.storage
        .from(BUCKET)
        .upload(key, buffer, { contentType: 'application/pdf', upsert: true });
      if (error) throw new NotFoundException('Invoice PDF not available yet');
      await this.prisma.billingInvoice.update({ where: { id: invoice.id }, data: { pdf_url: key } });
      return this.sign(key);
    }
    return this.sign(invoice.pdf_url);
  }

  private async sign(key: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, 60 * 10);
    if (error || !data?.signedUrl) throw new NotFoundException('Could not sign invoice PDF');
    return data.signedUrl;
  }
}
