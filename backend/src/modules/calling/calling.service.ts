import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { DemoRunStatus, CallDisposition, CallSentiment, CallLanguage, CallStatus } from '@prisma/client';
import { CallExtractionService } from './call-extraction.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  getSegment,
  parseSegmentRules,
  parseVipRule,
  applyVipRule,
  NO_FOLLOWUP_SEGMENT,
} from '../../common/utils/segment.util';
import { dedupeByPhone } from '../../common/utils/contact-cadence.util';
import { isPdcCooldownActive, pdcCooldownMessage } from '../../common/utils/pdc-cooldown.util';
import { computeCallbackTime, CallbackIntent } from '../../common/utils/callback-slot.util';
import { computePromiseDate, promiseBasisLabel, PromiseIntent } from '../../common/utils/promise-date.util';
import { BillingGateService } from '../billing/billing-gate.service';
import {
  amountToSpoken,
  buildSegmentInstructions,
  buildCallHistorySummary,
  buildDaysMention,
  buildMultiInvoiceNote,
  buildPartialPaymentNote,
  buildLastBillNote,
  getISTGreeting,
  transliterateNameToDevanagari,
  transliterateCityToDevanagari,
  toProperCase,
  spokenBusinessName,
  toE164India,
} from '../../common/utils/call-script.util';

@Injectable()
export class CallingService {
  private readonly logger = new Logger(CallingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: CallExtractionService,
    private readonly whatsappService: WhatsappService,
    private readonly billingGate: BillingGateService,
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
      case 'relative_minutes':
        return { kind: 'relativeMinutes', minutes: Number(cb.minutes) || 5 };
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

  // Map the LLM extraction's promise block to the promise-date util's intent.
  // Payment INTENT only — the actual date math happens in computePromiseDate.
  private mapPromiseIntent(p: any): PromiseIntent {
    if (!p || !p.kind || p.kind === 'none') return { kind: 'none' };
    switch (p.kind) {
      case 'specific': {
        const at = p.datetime ? new Date(p.datetime) : null;
        return at && !isNaN(at.getTime()) ? { kind: 'specific', at } : { kind: 'none' };
      }
      case 'tomorrow':
        return { kind: 'tomorrow' };
      case 'relative_days':
        return { kind: 'relativeDays', days: Number(p.days) || 1 };
      case 'end_of_week':
        return { kind: 'endOfWeek' };
      case 'end_of_month':
        return { kind: 'endOfMonth' };
      default:
        return { kind: 'none' };
    }
  }

  // ─── Production: queue an AI recovery call to a real customer ─────────────
  // Mirrors the demo flow's intelligence (multi-invoice totals, partial
  // payment, call history, sensitive cooldown) but reads everything from the
  // real Customer/Invoice/CallLog tables and records into CallLog.
  async queueCustomerCall(
    businessId: string,
    customerId: string,
    opts: {
      phoneOverride?: string;
      /**
       * Fallback dial to the next number of the SAME attempt. Every
       * per-customer guard already passed moments ago, so none are re-run.
       */
      skipCooldown?: boolean;
      /**
       * A re-dial the customer explicitly asked for ("call me in 5 minutes").
       * Waives ONLY the 60-minute repeat gap, which exists to stop accidental
       * double-dialling in bulk runs and should not override a direct request.
       * The sensitive-situation and PDC cooldowns still apply.
       */
      isScheduledCallback?: boolean;
    } = {},
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, business_id: businessId },
      include: {
        business: { select: { name: true, segment_rules: true, handoff_number: true, vip_rule: true, call_language: true, city: true } },
        invoices: {
          where: { due_amount: { gt: 0 }, status: { not: 'PAID' } },
          orderBy: { invoice_date: 'asc' },
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');
    const dialPhone = opts.phoneOverride ?? customer.phone;
    if (!dialPhone) throw new BadRequestException('Customer has no phone number: add one first');
    if (customer.invoices.length === 0)
      throw new BadRequestException('Customer has no outstanding invoices');

    // Sensitive situation cooldown: death/medical emergency pauses calling
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

    // PDC cooldown: a party whose cheque just cleared is not chased again while
    // the payment settles. Skipped for fallback dials within the same attempt,
    // which have already passed this check once.
    if (!opts.skipCooldown) {
      const outstanding = await this.prisma.outstanding.findFirst({
        where: { business_id: businessId, customer_id: customerId },
        select: { pdc_cooldown_until: true },
      });
      if (isPdcCooldownActive(outstanding?.pdc_cooldown_until)) {
        throw new BadRequestException(
          pdcCooldownMessage(customer.customer_name, outstanding!.pdc_cooldown_until!),
        );
      }
    }

    // 60-min same-customer cooldown: never ring the same person twice in a
    // row. Skipped for fallback dials to the next number of the SAME attempt,
    // and for a callback the customer themselves asked for — a request to be
    // rung back in 5 minutes must not be swallowed by an anti-repeat guard.
    if (!opts.skipCooldown && !opts.isScheduledCallback) {
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
    }

    // Multi-invoice totals: speak the TOTAL due, oldest days drives the segment.
    // A per-customer custom schedule overrides the business segment rules.
    const totalDue = customer.invoices.reduce((s, i) => s + i.due_amount, 0);
    const maxDays = Math.max(...customer.invoices.map((i) => i.days_overdue));
    const rules = parseSegmentRules(customer.custom_schedule ?? customer.business.segment_rules);
    // VIPs inside the business's VIP range use its chosen script instead of
    // the day-range segment (VIP calls are always manually triggered).
    // An explicit per-customer custom schedule outranks the VIP rule.
    const segment = applyVipRule(
      getSegment(maxDays, totalDue, rules),
      customer.is_vip,
      maxDays,
      customer.custom_schedule ? null : parseVipRule(customer.business.vip_rule),
    );

    // The No Follow-up range receives NOTHING: not even manual calls
    if (segment === NO_FOLLOWUP_SEGMENT) {
      throw new BadRequestException(
        `${customer.customer_name} is in the "${NO_FOLLOWUP_SEGMENT}" range (${maxDays} days overdue): no calls or messages are sent to this segment.`,
      );
    }

    // The agent ALWAYS starts in Hindi/Hinglish and mirrors whatever language
    // the customer speaks (the canvas decides that live). So every spoken
    // variable is sent TWICE: the Hindi one the Hinglish flow already used,
    // plus an English companion the canvas uses the moment it switches to
    // English — that beats making the model translate amounts on the fly.
    const multiInvoiceNote = buildMultiInvoiceNote(
      customer.invoices.length,
      totalDue,
      maxDays,
      'HINDI',
    );
    const multiInvoiceNoteEn = buildMultiInvoiceNote(
      customer.invoices.length,
      totalDue,
      maxDays,
      'ENGLISH',
    );

    // Partial payment: bill amount higher than remaining due means money came in
    const totalBilled = customer.invoices.reduce((s, i) => s + (i.amount || i.due_amount), 0);
    const previousPaid = Math.round(totalBilled - totalDue);
    const partialPaymentNote = buildPartialPaymentNote(previousPaid, totalDue, totalBilled, 'HINDI');
    const partialPaymentNoteEn = buildPartialPaymentNote(previousPaid, totalDue, totalBilled, 'ENGLISH');

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

    // Unresolved dispute: if the LAST analyzed call ended as DISPUTE, Meena
    // must FIRST ask whether the issue got sorted before any payment talk
    // (the {dispute_note} section in the agent canvas). A resolved dispute
    // ends the chain naturally: that call's disposition won't be DISPUTE.
    const lastAnalyzed = await this.prisma.callLog.findFirst({
      where: { customer_id: customerId, disposition: { not: null } },
      orderBy: { created_at: 'desc' },
      select: { disposition: true, key_objection: true, call_summary: true },
    });
    let disputeNote = '';
    if (lastAnalyzed?.disposition === 'DISPUTE') {
      const issue = lastAnalyzed.key_objection || lastAnalyzed.call_summary || '';
      disputeNote =
        `UNRESOLVED DISPUTE from the previous call.` +
        (issue ? ` What the customer said last time: "${issue}".` : '') +
        ` Before ANY payment talk, FIRST ask warmly whether that issue got resolved.` +
        ` If they say YES (solve/clear ho gaya): continue the normal payment reminder and date question.` +
        ` If they say NO (abhi bhi issue hai): do NOT push for payment, do NOT repeat the amount;` +
        ` sympathize, say the seniors/accounts team will get it resolved quickly, and close warmly.`;
    }

    const businessName = spokenBusinessName(customer.business.name);
    const segmentInstructions = buildSegmentInstructions(segment, businessName, 'HINDI');
    const segmentInstructionsEn = buildSegmentInstructions(segment, businessName, 'ENGLISH');

    const daysMention = buildDaysMention(maxDays, 'HINDI');
    const daysMentionEn = buildDaysMention(maxDays, 'ENGLISH');

    // Most recent bill (by invoice date) for "which/last bill" questions —
    // amount + date only, never the Tally bill number.
    const latestInvoice = customer.invoices.reduce((a, b) =>
      b.invoice_date > a.invoice_date ? b : a,
    );
    const lastBillAmount = latestInvoice.amount || latestInvoice.due_amount;
    const lastBillNote = buildLastBillNote(lastBillAmount, latestInvoice.invoice_date, 'HINDI');
    const lastBillNoteEn = buildLastBillNote(lastBillAmount, latestInvoice.invoice_date, 'ENGLISH');

    // Hindi is what the call opens in, so names/city are transliterated to
    // Devanagari for the Indic TTS. The Roman proper-case versions ride along
    // for the moment the agent switches to English.
    // Per-business city (admin-set) drives what Meena says for "aap kahaan se
    // bol rahe ho?"; env + Mumbai are only the legacy fallback.
    const cityRaw = customer.business.city || process.env.CALL_BUSINESS_CITY || 'Mumbai';
    const [customerNameSpoken, businessCitySpoken] = await Promise.all([
      transliterateNameToDevanagari(customer.customer_name),
      transliterateCityToDevanagari(cityRaw),
    ]);
    const customerNameEn = toProperCase(customer.customer_name);
    const businessCityEn = toProperCase(cityRaw);

    const callLog = await this.prisma.callLog.create({
      data: {
        business_id: businessId,
        customer_id: customerId,
        call_status: CallStatus.PENDING,
        dialed_phone: dialPhone,
      },
    });

    await this.callingQueue.add('outbound-calls', {
      callLogId: callLog.id,
      businessId,
      phoneNumber: dialPhone,
      context: {
        business_name: businessName,
        business_city: businessCitySpoken,
        customer_name: customerNameSpoken,
        due_amount: totalDue.toLocaleString('en-IN'),
        due_amount_hindi: amountToSpoken(totalDue, 'HINDI'),
        days_overdue: maxDays.toString(),
        segment,
        segment_instructions: segmentInstructions,
        call_history_summary: histSummary,
        multi_invoice_note: multiInvoiceNote,
        partial_payment_note: partialPaymentNote,
        // Per-business senior/human transfer number; platform env var is the
        // fallback. Normalized to E.164 (+91…) so Bolna's blind transfer dials
        // it — a bare 10-digit value here fails to bridge silently.
        handoff_number: toE164India(
          customer.business.handoff_number || process.env.BOLNA_HANDOFF_NUMBER || '',
        ),
        greeting_time: getISTGreeting(),
        days_mention: daysMention,
        dispute_note: disputeNote,
        // ── English companions: used only once the customer switches to English
        due_amount_english: amountToSpoken(totalDue, 'ENGLISH'),
        segment_instructions_english: segmentInstructionsEn,
        multi_invoice_note_english: multiInvoiceNoteEn,
        partial_payment_note_english: partialPaymentNoteEn,
        days_mention_english: daysMentionEn,
        customer_name_english: customerNameEn,
        business_city_english: businessCityEn,
        last_bill_note: lastBillNote,
        last_bill_note_english: lastBillNoteEn,
        // Raw Tally bill number of the latest invoice — spoken ONLY if the
        // customer explicitly asks for the bill number (read slowly in the canvas).
        last_bill_number: latestInvoice.invoice_number || '',
      },
    });

    return {
      success: true,
      callLogId: callLog.id,
      segment,
      message: `Call queued to ${customer.customer_name}: their phone should ring shortly`,
    };
  }

  // ─── Bulk: queue calls to every eligible customer in a segment ─────────────
  // Eligible = ACTIVE outstanding in the segment AND a phone number on file.
  // Per-customer guards (sensitive cooldown, 60-min gap) still apply: those
  // customers are reported as skipped, not errors.
  async queueSegmentCalls(businessId: string, segment: string, vipOnly = false) {
    // The No Follow-up range receives no contact at all
    if (segment === NO_FOLLOWUP_SEGMENT) {
      throw new BadRequestException(
        `"${NO_FOLLOWUP_SEGMENT}" customers are never called or messaged.`,
      );
    }
    // VIP protection: VIPs NEVER receive automated/bulk calls unless the user
    // explicitly targets them (vipOnly toggle, or the special "VIP" segment
    // which means "all VIP customers regardless of segment").
    const isVipSegment = segment === 'VIP';
    const outstandings = await this.prisma.outstanding.findMany({
      where: {
        business_id: businessId,
        status: 'ACTIVE',
        ...(isVipSegment ? {} : { segment }),
        customer: { is_vip: isVipSegment || vipOnly },
        // Parties still settling a cleared cheque are excluded up front, so the
        // reported count reflects what will actually be dialed.
        OR: [{ pdc_cooldown_until: null }, { pdc_cooldown_until: { lte: new Date() } }],
      },
      include: { customer: { select: { id: true, customer_name: true, phone: true } } },
    });

    const withPhone = outstandings.filter((o) => o.customer?.phone);
    const noPhone = outstandings.length - withPhone.length;

    // One dial per physical handset. Several parties in the same ledger
    // routinely share a number (a group accountant, one proprietor with three
    // firms); without this, that single phone rings once per party back to
    // back, which is exactly what gets a CLI reported as spam.
    const { unique: eligible, duplicates } = dedupeByPhone(withPhone, (o) => o.customer?.phone);

    // Billing gate: batches are skipped while the subscription mandate is
    // halted or the tenant's Bolna balance can't cover the estimated cost.
    if (eligible.length > 0) {
      const gate = await this.billingGate.checkCallDispatch(businessId, eligible.length);
      if (!gate.allowed) {
        this.logger.warn(`Batch dispatch skipped for ${businessId}: ${gate.reason}`);
        throw new BadRequestException(gate.reason);
      }
    }

    let queued = 0;
    const skipped: Array<{ customer: string; reason: string }> = duplicates.map((o) => ({
      customer: o.customer.customer_name,
      reason: 'Another party in this batch shares the same phone number',
    }));

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
      shared_number: duplicates.length,
      skipped,
      message: `${queued} call(s) queued for ${vipOnly ? 'VIP ' : ''}${segment}${noPhone ? `: ${noPhone} customer(s) have no phone number` : ''}${duplicates.length ? `; ${duplicates.length} skipped as duplicate number(s)` : ''}`,
    };
  }

  /**
   * Bolna's pre-call transfer webhook: fired the moment Meena decides to hand a
   * call to a human (Branch C), BEFORE the bridge. Bolna's transfer is a blind
   * transfer with no agent-side whisper, so we brief the human out-of-band:
   * look the call up, assemble the party context, and WhatsApp it to the
   * handoff number so it lands as the transferred call rings through.
   *
   * Correlation, most reliable first: metadata.call_log_id (we set it on
   * dispatch) → execution/call id echoed by Bolna. Everything is best-effort:
   * a failed lookup or WhatsApp send must NEVER disturb the live transfer.
   */
  async handleTransferContext(payload: any) {
    try {
      // Log the raw payload once per transfer: Bolna's exact field names for a
      // pre-call webhook aren't documented, so this confirms which identifier
      // actually arrives and lets us tighten correlation if needed.
      this.logger.log(`Transfer-context payload: ${JSON.stringify(payload)}`);

      // call_log_id is our own id, passed as a call variable (%(call_log_id)s)
      // and/or metadata — the reliable match. Fall back to any execution/call id.
      const callLogId: string | undefined =
        payload?.call_log_id || payload?.metadata?.call_log_id;
      const execId: string | undefined =
        payload?.execution_id || payload?.id || payload?.call_id || payload?.call_sid;

      const call = callLogId
        ? await this.prisma.callLog.findUnique({ where: { id: callLogId } })
        : execId
          ? await this.prisma.callLog.findFirst({ where: { retell_call_id: execId } })
          : null;

      if (!call) {
        this.logger.warn(
          `Transfer-context webhook could not match a call (call_log_id=${callLogId ?? 'none'} exec=${execId ?? 'none'})`,
        );
        return;
      }

      const [customer, business, outstanding, lastPromise] = await Promise.all([
        this.prisma.customer.findUnique({
          where: { id: call.customer_id },
          select: { customer_name: true, city: true, phone: true, is_vip: true },
        }),
        this.prisma.business.findUnique({
          where: { id: call.business_id },
          select: { handoff_number: true },
        }),
        this.prisma.outstanding.findUnique({
          where: { customer_id: call.customer_id },
          select: { segment: true, total_due: true, aging_bucket: true },
        }),
        this.prisma.promiseToPay.findFirst({
          where: { customer_id: call.customer_id },
          orderBy: { created_at: 'desc' },
          select: { promised_date: true },
        }),
      ]);

      const handoffTo = business?.handoff_number || process.env.BOLNA_HANDOFF_NUMBER;
      if (!handoffTo) {
        this.logger.warn(`Transfer-context: no handoff number for business ${call.business_id}`);
        return;
      }

      const due = outstanding?.total_due
        ? `Rs.${outstanding.total_due.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        : 'n/a';
      const promise = lastPromise?.promised_date
        ? lastPromise.promised_date.toLocaleDateString('en-IN')
        : 'none on record';
      const reason = payload?.reason ? String(payload.reason).trim() : 'customer requested a human';
      const recap = payload?.summary ? String(payload.summary).trim() : '';

      // One compact briefing (fills the handoff template's {{1}}). Kept short so
      // the human can read it at a glance as the call comes through.
      const briefing = [
        `Incoming AI transfer${customer?.is_vip ? ' (VIP)' : ''}: ${customer?.customer_name ?? 'Unknown party'}${customer?.city ? `, ${customer.city}` : ''}.`,
        `Segment: ${outstanding?.segment ?? 'n/a'}. Outstanding: ${due}.`,
        `Last promised date: ${promise}.`,
        `Reason: ${reason}.`,
        recap ? `Recap: ${recap}` : '',
      ]
        .filter(Boolean)
        .join(' ');

      await this.whatsappService.sendAgentHandoff(call.business_id, handoffTo, briefing);
      this.logger.log(
        `Transfer-context briefing sent to ${handoffTo} for ${customer?.customer_name ?? call.customer_id}`,
      );
    } catch (err: any) {
      // Never let a briefing failure interfere with the transfer itself
      this.logger.warn(`Transfer-context handling failed: ${err?.message || err}`);
    }
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
      // Call connected: nothing extra to do

    } else if (status === 'call-disconnected') {
      // Call disconnected: save recording URL immediately
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
      // Call completed: save recording and run analysis
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
      // Call never connected: try the customer's next number, if any
      await this.tryNextPhone(callId);
    }
  }

  // ─── Fallback dialing ───────────────────────────────────────────────────────
  // A customer row can carry several numbers (phone + alt_phones). When the
  // dialed number goes unanswered or the call fails, immediately dial the NEXT
  // number in the list. An answered call ends the chain naturally (its
  // disposition won't be NO_ANSWER, so this never fires).
  private async tryNextPhone(callId: string) {
    try {
      const log = await this.prisma.callLog.findUnique({
        where: { retell_call_id: callId },
        select: { business_id: true, customer_id: true, dialed_phone: true },
      });
      if (!log?.dialed_phone) return;

      const customer = await this.prisma.customer.findUnique({
        where: { id: log.customer_id },
        select: { phone: true, alt_phones: true, customer_name: true },
      });
      if (!customer) return;

      const numbers = [customer.phone, ...(customer.alt_phones ?? [])].filter(
        (n): n is string => !!n,
      );
      const idx = numbers.indexOf(log.dialed_phone);
      if (idx === -1 || idx + 1 >= numbers.length) return; // no more numbers

      const next = numbers[idx + 1];
      this.logger.log(
        `No answer on ${log.dialed_phone} for ${customer.customer_name}: falling back to ${next} (${idx + 2}/${numbers.length})`,
      );
      await this.queueCustomerCall(log.business_id, log.customer_id, {
        phoneOverride: next,
        skipCooldown: true,
      });
    } catch (err: any) {
      // Fallback dialing must never break webhook processing
      this.logger.warn(`Fallback dial after ${callId} skipped: ${err?.message || err}`);
    }
  }

  private async handleCallAnalyzed(callId: string, payload: any) {
    const transcript: string = payload.transcript || '';

    // Bolna extractions: deeply nested structure: extractions.field_name.field_name.subjective/objective
    const extractions = payload.custom_extractions || payload.extracted_data || payload.agent_extraction || {};
    this.logger.log(`Bolna extractions for ${callId}: ${JSON.stringify(extractions)}`);

    // Bolna nests each extraction as: extractions.promised_date.promised_date.subjective
    const promisedDateRaw = extractions?.promised_date?.promised_date?.subjective
      ?? extractions?.promised_date?.promised_date?.objective
      ?? extractions?.promised_date?.subjective
      ?? extractions?.promised_date;
    // Bolna's own date extraction is only a FALLBACK now: it miscomputes
    // relative phrases ("end of the month" came back as the call date). Our
    // own today-aware computation below takes precedence.
    const bolnaPromisedDate = this.parseDate(promisedDateRaw);

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
      this.logger.warn(`Extraction returned null for call ${callId}: storing Bolna data only`);
    }

    // Prefer our today-aware promise date (computed from the LLM's intent, not
    // its date arithmetic); fall back to Bolna's raw extraction only if the
    // customer made no payment commitment we could parse.
    const promiseIntent = this.mapPromiseIntent(extraction?.promise);
    const computedPromise = computePromiseDate(promiseIntent);
    const promisedDate = computedPromise ?? bolnaPromisedDate;
    // Only label when OUR computation set the date; a Bolna fallback has no known basis.
    const promiseBasis = computedPromise ? promiseBasisLabel(promiseIntent) : null;

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

    // Production customer calls: same extraction, recorded on CallLog
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
        promise_basis: promiseBasis,
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
            this.logger.warn(`Auto WhatsApp after call ${callId} not delivered to file number: awaiting inbound reply: ${err?.message || err}`);
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
      // Floor is 20s, not 60s: extraction runs after the call ends, so a
      // "5 minute baad" asked early in a 4-minute call already has most of its
      // delay spent by the time we get here. A 60s floor silently dropped
      // those. Anything under the floor is effectively "now" and is skipped.
      if (when && delayMs > 20_000 && delayMs <= 25 * 24 * 60 * 60 * 1000) {
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
          // Persist the slot so the dashboard can show "Next call: …"
          await this.prisma.callLog.updateMany({
            where: { retell_call_id: callId },
            data: { next_call_at: when },
          });
          this.logger.log(
            `Callback for customer ${cbLog.customer_id} scheduled at ${when.toISOString()} (in ${Math.round(delayMs / 60000)} min)`,
          );
        }
      }
    }

    if (isSensitive) {
      this.logger.warn(`Sensitive situation flagged for call ${callId}: cooldown applied`);
    }

    // Not picked up → immediately try the customer's next number (if the
    // Excel row carried more than one). Answered calls never reach here.
    if (extraction?.disposition === 'NO_ANSWER' && !isSensitive) {
      await this.tryNextPhone(callId);
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
