import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp.service';

// How far ahead of the cheque date the reminder goes out. The approved AiSensy
// template says "in 2 days" in plain text, so this constant and that template
// have to move together.
export const PDC_REMINDER_DAYS_BEFORE = 2;

// Fallback slot for a business that somehow has no WhatsApp hours saved.
const DEFAULT_HOUR = 10;

/**
 * The PDC cheque-due reminder run.
 *
 * Fires hourly and, for each tenant, acts only in the FIRST WhatsApp slot
 * configured in Settings (a tenant that messages at 10:00 and 16:00 sends
 * cheque reminders once, at 10:00). Weekdays and months are deliberately not
 * applied here: the cheque date is a hard bank date, so a reminder that is
 * postponed to the next "allowed" day is worthless.
 *
 * Idempotency is the cheque's `reminder_sent_at`, so a retry, a second slot or
 * a redeploy can never send the same party the same reminder twice.
 */
@Processor('pdc-reminders', { concurrency: 1 })
export class PdcReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(PdcReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {
    super();
  }

  // Prisma client may not have the PDC models typed until the client regenerates
  private get db() {
    return this.prisma as any;
  }

  async process(_job: Job) {
    const nowIst = new Date(Date.now() + 330 * 60000);
    const hour = nowIst.getUTCHours();
    const slot = `${String(hour).padStart(2, '0')}:00 IST`;

    // The IST calendar day the reminder is about, expressed with the same
    // constructor the upload/manual entry used to store cheque_date, so the
    // day window lines up whatever timezone the server runs in.
    const target = new Date(
      Date.UTC(
        nowIst.getUTCFullYear(),
        nowIst.getUTCMonth(),
        nowIst.getUTCDate() + PDC_REMINDER_DAYS_BEFORE,
      ),
    );
    const [y, m, d] = [target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()];
    const dayStart = new Date(y, m, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m, d, 23, 59, 59, 999);

    const businesses = await this.prisma.business.findMany({
      where: { status: 'ACTIVE', pdc_reminder_enabled: true } as any,
      select: { id: true, name: true, auto_whatsapp_hours: true },
    });

    const due = businesses.filter((b) => {
      const hours = Array.isArray(b.auto_whatsapp_hours) && b.auto_whatsapp_hours.length > 0
        ? b.auto_whatsapp_hours
        : [DEFAULT_HOUR];
      return Math.min(...hours) === hour;
    });

    if (due.length === 0) {
      return { slot, businesses: 0, sent: 0 };
    }

    let totalSent = 0;
    for (const business of due) {
      try {
        totalSent += await this.runForBusiness(business, dayStart, dayEnd, slot);
      } catch (err: any) {
        // One bad tenant must never stop the rest of the run.
        this.logger.error(
          `PDC reminder ${slot}: ${business.name} failed: ${err?.message || err}`,
        );
      }
    }

    this.logger.log(
      `PDC reminder ${slot} finished: ${totalSent} reminder(s) sent across ${due.length} business(es)`,
    );
    return { slot, businesses: due.length, sent: totalSent };
  }

  private async runForBusiness(
    business: { id: string; name: string },
    dayStart: Date,
    dayEnd: Date,
    slot: string,
  ): Promise<number> {
    const cheques = await this.db.pdcCheque.findMany({
      where: {
        business_id: business.id,
        status: 'PENDING',
        reminder_sent_at: null,
        cheque_date: { gte: dayStart, lte: dayEnd },
        customer_id: { not: null },
      },
      include: {
        customer: { select: { id: true, customer_name: true, phone: true, is_vip: true } },
      },
      orderBy: { cheque_no: 'asc' },
    });

    if (cheques.length === 0) return 0;

    // One message per party, not per cheque: a party handing over three cheques
    // dated the same day gets one reminder listing all three.
    const byCustomer = new Map<string, any[]>();
    let noPhone = 0;
    let vipSkipped = 0;

    for (const c of cheques) {
      if (!c.customer?.phone) {
        noPhone++;
        continue;
      }
      // VIPs are manual-only across the whole platform; the reminder does not
      // make an exception for them.
      if (c.customer.is_vip) {
        vipSkipped++;
        continue;
      }
      const list = byCustomer.get(c.customer.id) ?? [];
      list.push(c);
      byCustomer.set(c.customer.id, list);
    }

    let sent = 0;
    for (const group of byCustomer.values()) {
      const first = group[0];
      const amount = group.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const chequeNos = group.map((c: any) => c.cheque_no).join(', ');

      try {
        await this.whatsapp.sendPdcChequeReminder({
          businessId: business.id,
          businessName: business.name,
          customerId: first.customer.id,
          toPhone: first.customer.phone,
          partyName: first.customer.customer_name,
          chequeNo: chequeNos,
          chequeDate: first.cheque_date,
          amount,
        });
        await this.db.pdcCheque.updateMany({
          where: { id: { in: group.map((c: any) => c.id) } },
          data: { reminder_sent_at: new Date() },
        });
        sent += 1;
      } catch (err: any) {
        // Left unmarked on purpose: the next hourly run retries it, and the
        // reminder is only useful while the cheque date is still ahead.
        this.logger.warn(
          `PDC reminder ${slot}: ${business.name} / ${first.party_name} failed: ${err?.message || err}`,
        );
      }
    }

    this.logger.log(
      `PDC reminder ${slot}: ${business.name} sent ${sent} of ${byCustomer.size} party(ies)` +
        `${noPhone ? `, ${noPhone} cheque(s) had no phone on file` : ''}` +
        `${vipSkipped ? `, ${vipSkipped} skipped as VIP` : ''}`,
    );
    return sent;
  }

  @OnWorkerEvent('failed')
  onFailed(_job: Job, err: Error) {
    this.logger.error(`PDC reminder run failed: ${err?.message}`);
  }
}
