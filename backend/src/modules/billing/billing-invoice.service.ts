import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prisma, BillingPayment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingInvoicePdfService, InvoiceLineItem } from './billing-invoice-pdf.service';
import { financialYearCode } from './billing-math.util';

const BUCKET = 'billing-invoices';

// Bump whenever the invoice PDF LAYOUT changes. The version is baked into the
// storage key, so a bumped version makes every cached PDF look "missing": the
// next download re-renders it in the new format and purges the old object.
// v1 = original mahogany layout · v2 = Praecis AI logo header · v3 = totals
// rewrite (alignment still off) · v4 = totals value column aligned to the
// line-item AMOUNT column.
const PDF_TEMPLATE_VERSION = 4;

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

  /** Version-stamped storage key: a template bump changes it, orphaning the old file. */
  private pdfKey(businessId: string, invoiceNumber: string): string {
    return `${businessId}/${invoiceNumber.replace(/\//g, '-')}.v${PDF_TEMPLATE_VERSION}.pdf`;
  }

  /**
   * Render the invoice PDF from its stored fields, upload it at the current
   * version's key, purge any previous (stale-format) object, and point the row
   * at the fresh key. Returns the new key. Shared by create + download paths.
   */
  private async renderAndStore(invoice: {
    id: string;
    business_id: string;
    invoice_number: string;
    line_items: unknown;
    taxable_value: number;
    gst: number;
    total: number;
    created_at: Date;
    pdf_url: string | null;
  }): Promise<string> {
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
    const key = this.pdfKey(invoice.business_id, invoice.invoice_number);
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType: 'application/pdf', upsert: true });
    if (error) throw new Error(error.message);

    // Purge the previous object so the old-format PDF cannot be served again
    if (invoice.pdf_url && invoice.pdf_url !== key) {
      await this.supabase.storage.from(BUCKET).remove([invoice.pdf_url]).catch(() => undefined);
    }
    await this.prisma.billingInvoice.update({ where: { id: invoice.id }, data: { pdf_url: key } });
    return key;
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
                description: 'PraecisAI 10-day trial: full platform access for 10 days',
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
      await this.renderAndStore({
        id: invoice.id,
        business_id: payment.business_id,
        invoice_number: invoice.invoice_number,
        line_items: lineItems,
        taxable_value: taxableValue,
        gst: payment.gst_amount,
        total: payment.total_amount,
        created_at: now,
        pdf_url: null,
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

    // Serve the cache only when it is the CURRENT template version. A stale
    // (old-format) or missing PDF is re-rendered for the SAME invoice row —
    // the number never changes — and the old object is purged.
    const currentKey = this.pdfKey(invoice.business_id, invoice.invoice_number);
    if (invoice.pdf_url === currentKey) return this.sign(currentKey);

    try {
      const key = await this.renderAndStore(invoice);
      return this.sign(key);
    } catch {
      throw new NotFoundException('Invoice PDF not available yet');
    }
  }

  private async sign(key: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, 60 * 10);
    if (error || !data?.signedUrl) throw new NotFoundException('Could not sign invoice PDF');
    return data.signedUrl;
  }
}
