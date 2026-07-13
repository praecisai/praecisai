import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { DemoRunStatus, CallDisposition, CallSentiment, CallLanguage, CallStatus } from '@prisma/client';
import { CallExtractionService } from './call-extraction.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { getSegment, parseSegmentRules } from '../../common/utils/segment.util';
import { computeCallbackTime, CallbackIntent } from '../../common/utils/callback-slot.util';
import {
  amountToHindi,
  numberToHindiWords,
  buildSegmentInstructions,
  buildCallHistorySummary,
  getISTGreeting,
  transliterateNameToDevanagari,
  transliterateCityToDevanagari,
  spokenBusinessName,
} from '../../common/utils/call-script.util';

@Injectable()
export class CallingService {
  private readonly logger = new Logger(CallingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: CallExtractionService,
    private readonly whatsappService: WhatsappService,
    @InjectQueue('outbound-calls') private readonly callingQueue: Queue,
    @InjectQueue('callback-redials') private readonly callbackQueue: Queue,
  ) {}

  // Map the LLM extraction's callback block to the slot util's intent shape.
  private mapCallbackIntent(cb: any): CallbackIntent {
    if (!cb || !cb.kind || cb.kind === 'none') return { kind: 'none' };
    switch (cb.kind) {
      case 'later':
        return { kind: 'later' };
      case 'tomorrow':
        return { kind: 'tomorrow' };
      case 'relative_hours':
        return { kind: 'relativeHours', hours: Number(cb.hours) || 1 };
      case 'relative_days':
        return { kind: 'relativeDays', days: Number(cb.days) || 1 };
      case 'specific': {
        const at = cb.datetime ? new Date(cb.datetime) : null;
        if (!at || isNaN(at.getTime())) return { kind: 'later' };
        return { kind: 'specific', at, hasTime: !!cb.has_time };
      }
      default:
        return { kind: 'none' };
    }
  }

  // ─── Production: queue an AI recovery call to a real customer ─────────────
  // Mirrors the demo flow's intelligence (multi-invoice totals, partial
  // payment, call history, sensitive cooldown) but reads everything from the
  // real Customer/Invoice/CallLog tables and records into CallLog.
  async queueCustomerCall(businessId: string, customerId: string) {
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
    if (!customer.phone) throw new BadRequestException('Customer has no phone number — add one first');
    if (customer.invoices.length === 0)
      throw new BadRequestException('Customer has no outstanding invoices');

    // Sensitive situation cooldown — death/medical emergency pauses calling
    const sensitive = await this.prisma.callLog.findFirst({
      where: {
        customer_id: customerId,
        is_sensitive: true,
        sensitive_cooldown_until: { gte: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
    if (sensitive?.sensitive_cooldown_until) {
      const daysLeft = Math.ceil(
        (sensitive.sensitive_cooldown_until.getTime() - Date.now()) / 86400000,
      );
      throw new BadRequestException(
        `This customer mentioned a sensitive situation. Calling paused for ${daysLeft} more day${daysLeft !== 1 ? 's' : ''} out of respect.`,
      );
    }

    // 60-min same-customer cooldown — never ring the same person twice in a row
    const recentCall = await this.prisma.callLog.findFirst({
      where: {
        customer_id: customerId,
        created_at: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentCall) {
      throw new BadRequestException(
        'This customer was called within the last 60 minutes. Please wait before calling again.',
      );
    }

    // Multi-invoice totals — speak the TOTAL due, oldest days drives the segment
    const totalDue = customer.invoices.reduce((s, i) => s + i.due_amount, 0);
    const maxDays = Math.max(...customer.invoices.map((i) => i.days_overdue));
    const segment = getSegment(maxDays, totalDue, parseSegmentRules(customer.business.segment_rules));

    const multiInvoiceNote =
      customer.invoices.length > 1
        ? `IMPORTANT — Multiple bills pending for this party: Total due across all invoices is ${amountToHindi(totalDue)}. The oldest bill is ${numberToHindiWords(maxDays)} दिन से pending है. In conversation, mention the TOTAL amount (${amountToHindi(totalDue)}) and say "कई bills pending हैं आपके।" Do NOT mention any specific bill number.`
        : '';

    // Partial payment — bill amount higher than remaining due means money came in
    const totalBilled = customer.invoices.reduce((s, i) => s + (i.amount || i.due_amount), 0);
    const previousPaid = Math.round(totalBilled - totalDue);
    const partialPaymentNote =
      previousPaid > 0
        ? `Partial payment context: Customer had already paid ${amountToHindi(previousPaid)} earlier against this account (original was ${amountToHindi(totalBilled)}). Acknowledge this warmly first: "आपने पहले ${amountToHindi(previousPaid)} दिए थे, बहुत शुक्रिया जी।" फिर बोलो: "अभी भी ${amountToHindi(totalDue)} pending है।" Do NOT mention bill number.`
        : '';

    // Call history from previous completed production calls
    const history =
      segment === 'Soft Reminder'
        ? []
        : await this.prisma.callLog.findMany({
            where: {
              customer_id: customerId,
              call_status: CallStatus.COMPLETED,
            },
            select: { call_summary: true, disposition: true, promise_date: true },
            orderBy: { created_at: 'asc' },
          });
    const histSummary = buildCallHistorySummary(history as any, segment);

    const businessName = spokenBusinessName(customer.business.name);
    const segmentInstructions = buildSegmentInstructions(segment, businessName);

    let daysMention = '';
    if (maxDays >= 30) {
      const months = Math.round(maxDays / 30);
      daysMention = `यह payment लगभग ${numberToHindiWords(months)} महीने से pending है।`;
    } else if (maxDays > 0) {
      const approxDays = Math.max(5, Math.round(maxDays / 5) * 5);
      daysMention = `यह payment लगभग ${numberToHindiWords(approxDays)} दिन से pending है।`;
    }

    const [customerNameSpoken, businessCitySpoken] = await Promise.all([
      transliterateNameToDevanagari(customer.customer_name),
      transliterateCityToDevanagari(process.env.CALL_BUSINESS_CITY || 'Mumbai'),
    ]);

    const callLog = await this.prisma.callLog.create({
      data: {
        business_id: businessId,
        customer_id: customerId,
        call_status: CallStatus.PENDING,
      },
    });

    await this.callingQueue.add('outbound-calls', {
      callLogId: callLog.id,
      businessId,
      phoneNumber: customer.phone,
      context: {
        business_name: businessName,
        business_city: businessCitySpoken,
        customer_name: customerNameSpoken,
        due_amount: totalDue.toLocaleString('en-IN'),
        due_amount_hindi: amountToHindi(totalDue),
        days_overdue: maxDays.toString(),
        segment,
        segment_instructions: segmentInstructions,
        call_history_summary: histSummary,
        multi_invoice_note: multiInvoiceNote,
        partial_payment_note: partialPaymentNote,
        handoff_number: process.env.BOLNA_HANDOFF_NUMBER || '',
        greeting_time: getISTGreeting(),
        days_mention: daysMention,
      },
    });

    return {
      success: true,
      callLogId: callLog.id,
      segment,
      message: `Call queued to ${customer.customer_name} — their phone should ring shortly`,
    };
  }

  // ─── Bulk: queue calls to every eligible customer in a segment ─────────────
  // Eligible = ACTIVE outstanding in the segment AND a phone number on file.
  // Per-customer guards (sensitive cooldown, 60-min gap) still apply — those
  // customers are reported as skipped, not errors.
  async queueSegmentCalls(businessId: string, segment: string, vipOnly = false) {
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

    let queued = 0;
    const skipped: Array<{ customer: string; reason: string }> = [];

    for (const o of eligible) {
      try {
        await this.queueCustomerCall(businessId, o.customer.id);
        queued++;
      } catch (err: any) {
        skipped.push({ customer: o.customer.customer_name, reason: err.message });
      }
    }

    return {
      success: true,
      segment,
      queued,
      no_phone: noPhone,
      skipped,
      message: `${queued} call(s) queued for ${vipOnly ? 'VIP ' : ''}${segment}${noPhone ? ` — ${noPhone} customer(s) have no phone number` : ''}`,
    };
  }

  async handleWebhook(payload: any) {
    this.logger.log(`Bolna webhook status: ${payload.status} id: ${payload.id}`);

    // Bolna sends status-based webhooks, not event-based like Retell
    // payload.id = execution_id = what we stored as retell_call_id
    const callId = payload.id;
    const status = payload.status;

    if (!callId) {
      this.logger.warn('Received webhook without call id');
      return;
    }

    // Map Bolna statuses to our flow
    if (status === 'initiated' || status === 'ringing') {
      // Mark as SENT when call is ringing
      await this.prisma.demoRun.updateMany({
        where: { retell_call_id: callId },
        data: { status: DemoRunStatus.SENT },
      });

    } else if (status === 'in-progress') {
      // Call connected — nothing extra to do

    } else if (status === 'call-disconnected') {
      // Call disconnected — save recording URL immediately
      const recordingUrl = payload.telephony_data?.recording_url;
      if (recordingUrl) {
        await this.prisma.demoRun.updateMany({
          where: { retell_call_id: callId },
          data: { call_recording_url: recordingUrl },
        });
        await this.prisma.callLog.updateMany({
          where: { retell_call_id: callId },
          data: { recording_url: recordingUrl },
        });
      }

    } else if (status === 'completed') {
      // Call completed — save recording and run analysis
      const recordingUrl = payload.telephony_data?.recording_url;
      if (recordingUrl) {
        await this.prisma.demoRun.updateMany({
          where: { retell_call_id: callId },
          data: { call_recording_url: recordingUrl },
        });
        await this.prisma.callLog.updateMany({
          where: { retell_call_id: callId },
          data: { recording_url: recordingUrl },
        });
      }
      await this.handleCallAnalyzed(callId, payload);

    } else if (status === 'failed' || status === 'error') {
      await this.prisma.demoRun.updateMany({
        where: { retell_call_id: callId },
        data: { status: DemoRunStatus.FAILED },
      });
      await this.prisma.callLog.updateMany({
        where: { retell_call_id: callId },
        data: { call_status: CallStatus.FAILED },
      });
    }
  }

  private async handleCallAnalyzed(callId: string, payload: any) {
    const transcript: string = payload.transcript || '';

    // Bolna extractions — deeply nested structure: extractions.field_name.field_name.subjective/objective
    const extractions = payload.custom_extractions || payload.extracted_data || payload.agent_extraction || {};
    this.logger.log(`Bolna extractions for ${callId}: ${JSON.stringify(extractions)}`);

    // Bolna nests each extraction as: extractions.promised_date.promised_date.subjective
    const promisedDateRaw = extractions?.promised_date?.promised_date?.subjective
      ?? extractions?.promised_date?.promised_date?.objective
      ?? extractions?.promised_date?.subjective
      ?? extractions?.promised_date;
    const promisedDate = this.parseDate(promisedDateRaw);

    const rawAmount = extractions?.promised_amount?.promised_amount?.objective
      ?? extractions?.promised_amount?.promised_amount?.subjective
      ?? extractions?.promised_amount?.subjective
      ?? extractions?.promised_amount;
    const promisedAmount = rawAmount ? parseFloat(String(rawAmount).replace(/[^0-9.]/g, '')) : null;

    const moodSummary = extractions?.customer_mood_summary?.customer_mood_summary?.subjective
      ?? extractions?.customer_mood_summary?.subjective
      ?? extractions?.customer_mood_summary
      ?? '';
    const callSentiment = this.mapSentiment(moodSummary, '');

    // Claude extraction from transcript
    const extraction = await this.extractionService.extract(transcript);

    if (!extraction) {
      this.logger.warn(`Extraction returned null for call ${callId} — storing Bolna data only`);
    }

    const isSensitive = extraction?.is_sensitive ?? false;
    const sensitiveCooldownUntil = isSensitive
      ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      : null;

    await this.prisma.demoRun.updateMany({
      where: { retell_call_id: callId },
      data: {
        ...(extraction && {
          call_summary: extraction.call_summary,
          disposition: extraction.disposition as CallDisposition,
          key_objection: extraction.key_objection,
          follow_up_required: extraction.follow_up_required,
          follow_up_notes: extraction.follow_up_notes,
          language_used: extraction.language_used as CallLanguage,
          talk_ratio: extraction.talk_ratio,
          is_sensitive: isSensitive,
          sensitive_cooldown_until: sensitiveCooldownUntil,
          extracted_at: new Date(),
        }),
        promise_date: promisedDate,
        call_sentiment: callSentiment,
      },
    });

    // Production customer calls — same extraction, recorded on CallLog
    const durationRaw =
      payload.telephony_data?.duration ?? payload.conversation_duration;
    const durationSeconds =
      typeof durationRaw === 'number' ? Math.round(durationRaw) : parseInt(String(durationRaw)) || null;

    await this.prisma.callLog.updateMany({
      where: { retell_call_id: callId },
      data: {
        call_status: CallStatus.COMPLETED,
        transcript: transcript || null,
        duration_seconds: durationSeconds,
        ...(extraction && {
          call_summary: extraction.call_summary,
          disposition: extraction.disposition as CallDisposition,
          key_objection: extraction.key_objection,
          language_used: extraction.language_used as CallLanguage,
          is_sensitive: isSensitive,
          sensitive_cooldown_until: sensitiveCooldownUntil,
        }),
        promise_date: promisedDate,
        call_sentiment: callSentiment,
      },
    });

    // Production-call follow-ups that need the CallLog (PTP + auto-WhatsApp)
    const whatsappRequested = extraction?.whatsapp_requested ?? false;
    if (promisedDate || whatsappRequested) {
      const callLog = await this.prisma.callLog.findUnique({
        where: { retell_call_id: callId },
        select: { id: true, business_id: true, customer_id: true },
      });
      if (callLog) {
        // Customer promised a payment date → record a Promise-to-Pay
        if (promisedDate) {
          const outstanding = await this.prisma.outstanding.findUnique({
            where: { customer_id: callLog.customer_id },
            select: { total_due: true },
          });
          await this.prisma.promiseToPay.create({
            data: {
              business_id: callLog.business_id,
              customer_id: callLog.customer_id,
              promised_amount: promisedAmount ?? outstanding?.total_due ?? 0,
              promised_date: promisedDate,
              notes: extraction?.call_summary ?? 'Captured from AI call',
            },
          });
        }

        // On the call the customer asked for the statement on WhatsApp and
        // Meena agreed → try to send it now to the number on file. If that
        // number isn't on WhatsApp (delivery fails), the request stays
        // `whatsapp_requested = true, fulfilled = false` so the inbound
        // handler can complete it when the customer replies from their WA
        // number (Stage 3 of FAQ 19).
        if (whatsappRequested) {
          let fulfilled = false;
          try {
            await this.whatsappService.sendStatementToCustomer(
              callLog.business_id,
              callLog.customer_id,
            );
            fulfilled = true;
            this.logger.log(`Auto-sent WhatsApp statement for call ${callId} (customer requested on call)`);
          } catch (err: any) {
            this.logger.warn(`Auto WhatsApp after call ${callId} not delivered to file number — awaiting inbound reply: ${err?.message || err}`);
          }
          await this.prisma.callLog.update({
            where: { id: callLog.id },
            data: { whatsapp_requested: true, whatsapp_fulfilled: fulfilled },
          });
        }
      }
    }

    // Customer asked to be called back → auto-schedule a re-dial. "baadme"/busy
    // snaps to the next 12pm/4pm slot; "kal"/"X din"/specific times are honoured;
    // delays over 15 days are treated as mischief and snapped to the next slot.
    // Never schedule when they already gave a payment date (that's a PTP, above).
    const callbackIntent = this.mapCallbackIntent(extraction?.callback);
    if (!promisedDate && !isSensitive && callbackIntent.kind !== 'none') {
      const when = computeCallbackTime(callbackIntent);
      const delayMs = when ? when.getTime() - Date.now() : 0;
      if (when && delayMs > 60_000 && delayMs <= 25 * 24 * 60 * 60 * 1000) {
        const cbLog = await this.prisma.callLog.findUnique({
          where: { retell_call_id: callId },
          select: { business_id: true, customer_id: true },
        });
        if (cbLog) {
          await this.callbackQueue.add(
            'callback-redial',
            {
              businessId: cbLog.business_id,
              customerId: cbLog.customer_id,
              scheduledFor: when.toISOString(),
            },
            { delay: delayMs, removeOnComplete: true, removeOnFail: 100, attempts: 2 },
          );
          this.logger.log(
            `Callback for customer ${cbLog.customer_id} scheduled at ${when.toISOString()} (in ${Math.round(delayMs / 60000)} min)`,
          );
        }
      }
    }

    if (isSensitive) {
      this.logger.warn(`Sensitive situation flagged for call ${callId} — cooldown applied`);
    }

    this.logger.log(
      `Call ${callId} analyzed: disposition=${extraction?.disposition ?? 'UNKNOWN'} sentiment=${callSentiment} ptp=${promisedDate?.toISOString() ?? 'none'} amount=${promisedAmount ?? 'none'}`,
    );
  }

  // Returns current time shifted to IST (UTC+5:30) so Supabase displays Indian time
  private parseDate(dateStr: any): Date | null {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    // Handle DD/MM/YYYY format from Bolna
    const ddmmyyyy = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  private toIST(date: Date): Date {
    return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  }

  private mapSentiment(moodSummary: any, retellSentiment: any): CallSentiment {
    const text = (String(moodSummary || retellSentiment || '')).toLowerCase();
    if (!text) return CallSentiment.UNKNOWN;
    if (text.includes('hostile') || text.includes('angry') || text.includes('rude')) return CallSentiment.HOSTILE;
    if (text.includes('negative') || text.includes('frustrated') || text.includes('reluctant')) return CallSentiment.NEGATIVE;
    if (text.includes('positive') || text.includes('cooperative') || text.includes('willing') || text.includes('agreeable')) return CallSentiment.POSITIVE;
    return CallSentiment.NEUTRAL;
  }
}
