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
  async sendStatementToCustomer(businessId: string, customerId: string) {
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
    if (!customer.phone) throw new BadRequestException('Customer has no phone number');
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
        destinationPhone: customer.phone,
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
}

function formatIndianDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
