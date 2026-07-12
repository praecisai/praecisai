import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatementPdfService, StatementInvoice } from './statement-pdf.service';
import { AisensyService } from './aisensy.service';
import { StorageService } from '../storage/storage.service';
import { getSegment, parseSegmentRules } from '../../common/utils/segment.util';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private prisma: PrismaService,
    private statementPdf: StatementPdfService,
    private aisensy: AisensyService,
    private storage: StorageService,
  ) {}

  async getLogs(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.whatsAppLog.findMany({
        where: { business_id: businessId }, skip, take: limit,
        orderBy: { created_at: 'desc' },
        include: { customer: { select: { id: true, customer_name: true } } },
      }),
      this.prisma.whatsAppLog.count({ where: { business_id: businessId } }),
    ]);
    return { data, total, page, limit };
  }

  async createLog(businessId: string, dto: any) {
    return this.prisma.whatsAppLog.create({
      data: { business_id: businessId, ...dto },
    });
  }

  /**
   * Send the outstanding-statement PDF to a real customer over WhatsApp.
   * Segment is always recalculated from the invoices via segment.util —
   * never trusted from the caller. Logged to WhatsAppLog either way.
   */
  async sendStatementToCustomer(businessId: string, customerId: string, overridePhone?: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, business_id: businessId },
      include: {
        business: { select: { name: true, segment_rules: true } },
        invoices: {
          where: { due_amount: { gt: 0 }, status: { not: 'PAID' } },
          orderBy: { invoice_date: 'asc' },
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');
    // overridePhone is used by the inbound flow when the customer replies with
    // a different WhatsApp number than the one on their party record.
    const destinationPhone = overridePhone ?? customer.phone;
    if (!destinationPhone) throw new BadRequestException('Customer has no phone number');
    if (customer.invoices.length === 0)
      throw new BadRequestException('Customer has no outstanding invoices');

    const rules = parseSegmentRules(customer.business.segment_rules);

    const invoices: StatementInvoice[] = customer.invoices.map((inv) => ({
      billNo: inv.invoice_number,
      billDate: formatIndianDate(inv.invoice_date),
      billAmount: inv.amount || inv.due_amount,
      dueAmount: inv.due_amount,
      daysOverdue: inv.days_overdue,
      status: getSegment(inv.days_overdue, inv.due_amount, rules),
    }));

    const totalDue = invoices.reduce((s, i) => s + i.dueAmount, 0);
    const maxDays = Math.max(...invoices.map((i) => i.daysOverdue));
    const segment = getSegment(maxDays, totalDue, rules);
    const agentName = customer.invoices.find((i) => i.sales_agent)?.sales_agent ?? undefined;

    const pdfBuffer = await this.statementPdf.generate({
      partyName: customer.customer_name,
      city: customer.city ?? undefined,
      agentName,
      segment,
      invoices,
      business: { name: customer.business.name },
    });

    const pdfUrl = await this.storage.uploadStatementPdf(
      `${businessId}/${customerId}`,
      pdfBuffer,
    );

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const pdfFilename = `${customer.customer_name}_Statement_${dd}-${mm}-${now.getFullYear()}.pdf`;

    const logMessage = `Statement PDF (${segment}) — Rs.${totalDue.toLocaleString('en-IN')} across ${invoices.length} invoice(s)`;

    try {
      await this.aisensy.sendStatement({
        segment,
        destinationPhone,
        partyName: customer.customer_name,
        totalDue,
        invoiceCount: invoices.length,
        pdfUrl,
        pdfFilename,
      });
    } catch (err) {
      await this.prisma.whatsAppLog.create({
        data: {
          business_id: businessId,
          customer_id: customerId,
          message: logMessage,
          delivery_status: 'FAILED',
        },
      });
      throw err;
    }

    await this.prisma.whatsAppLog.create({
      data: {
        business_id: businessId,
        customer_id: customerId,
        message: logMessage,
        delivery_status: 'SENT',
      },
    });

    return {
      success: true,
      segment,
      totalDue,
      invoiceCount: invoices.length,
      message: `WhatsApp statement sent to ${customer.customer_name}`,
    };
  }

  // ─── Bulk: statement PDFs to every eligible customer in a segment ──────────
  async sendSegmentStatements(businessId: string, segment: string, vipOnly = false) {
    const outstandings = await this.prisma.outstanding.findMany({
      where: {
        business_id: businessId,
        segment,
        status: 'ACTIVE',
        ...(vipOnly && { customer: { is_vip: true } }),
      },
      include: { customer: { select: { id: true, customer_name: true, phone: true } } },
      take: 100,
    });

    const eligible = outstandings.filter((o) => o.customer?.phone);
    const noPhone = outstandings.length - eligible.length;

    let sent = 0;
    const skipped: Array<{ customer: string; reason: string }> = [];

    for (const o of eligible) {
      try {
        await this.sendStatementToCustomer(businessId, o.customer.id);
        sent++;
      } catch (err: any) {
        skipped.push({ customer: o.customer.customer_name, reason: err.message });
      }
    }

    return {
      success: true,
      segment,
      sent,
      no_phone: noPhone,
      skipped,
      message: `${sent} statement(s) sent for ${vipOnly ? 'VIP ' : ''}${segment}${noPhone ? ` — ${noPhone} customer(s) have no phone number` : ''}`,
    };
  }

  /**
   * Handle an inbound WhatsApp message forwarded by AiSensy.
   *
   * Two cases we care about:
   *  1. A customer whose party-record phone IS on WhatsApp messages us
   *     ("bhej do") → send them their statement to the same number.
   *  2. Stage-3 of the on-call flow: the customer's business number is NOT on
   *     WhatsApp, so on the call they were told to reply from their real
   *     WhatsApp number with (optionally) the number to use. Their reply comes
   *     from an unknown WA number; we match it to the most recent call where
   *     `whatsapp_requested` is still unfulfilled and send there.
   *
   * Single AiSensy account = single business, so we resolve the business from
   * the matched customer / pending call rather than from the payload.
   */
  async handleInbound(payload: any) {
    const senderRaw =
      payload?.senderMobile ?? payload?.sender ?? payload?.mobile ??
      payload?.from ?? payload?.waId ?? payload?.wa_id ?? '';
    const text: string =
      payload?.message ?? payload?.text ?? payload?.messageBody ??
      payload?.body ?? payload?.button?.text ?? '';

    const sender = normalizeDigits(senderRaw);
    if (!sender) {
      this.logger.warn(`Inbound WhatsApp with no sender: ${JSON.stringify(payload).slice(0, 300)}`);
      return { handled: false, reason: 'no sender' };
    }

    // A 10-digit number inside the message = "send it to this number instead"
    const providedNumber = extractIndianMobile(text);

    // Case 2 first — a pending on-call request (matched by recency, not sender,
    // because the sender's WA number won't be on file).
    const pendingCall = await this.prisma.callLog.findFirst({
      where: {
        whatsapp_requested: true,
        whatsapp_fulfilled: false,
        created_at: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { created_at: 'desc' },
      select: { id: true, business_id: true, customer_id: true },
    });

    // Case 1 — the sender IS a known customer (their WA number is on file)
    const senderCustomer = await this.prisma.customer.findFirst({
      where: { phone: { endsWith: sender.slice(-10) } },
      select: { id: true, business_id: true },
    });

    const target = pendingCall ?? (senderCustomer
      ? { id: null as string | null, business_id: senderCustomer.business_id, customer_id: senderCustomer.id }
      : null);

    if (!target) {
      this.logger.log(`Inbound WhatsApp from ${sender} — no matching customer or pending request; ignored`);
      return { handled: false, reason: 'no match' };
    }

    const destination = providedNumber ?? sender;

    try {
      await this.sendStatementToCustomer(target.business_id, target.customer_id, destination);
      // Persist the working WhatsApp number so future sends reach them directly
      await this.prisma.customer.update({
        where: { id: target.customer_id },
        data: { phone: destination.length === 10 ? `+91${destination}` : `+${destination}` },
      });
      if (pendingCall) {
        await this.prisma.callLog.update({
          where: { id: pendingCall.id },
          data: { whatsapp_fulfilled: true },
        });
      }
      this.logger.log(`Inbound WhatsApp → statement sent to ${destination} for customer ${target.customer_id}`);
      return { handled: true, destination };
    } catch (err: any) {
      this.logger.error(`Inbound WhatsApp send failed: ${err?.message || err}`);
      return { handled: false, reason: err?.message };
    }
  }
}

// Keep only digits; strip +, spaces, country prefixes handled by caller
function normalizeDigits(raw: string | number): string {
  return String(raw ?? '').replace(/\D/g, '');
}

// Find a 10-digit Indian mobile inside free text (ignores the 91 prefix)
function extractIndianMobile(text: string): string | null {
  if (!text) return null;
  const m = text.replace(/\D/g, ' ').match(/(?:91)?([6-9]\d{9})/);
  return m ? m[1] : null;
}

function formatIndianDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
