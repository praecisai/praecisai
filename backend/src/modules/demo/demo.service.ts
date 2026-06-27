import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DemoLeadRepository } from './demo-lead.repository';
import { CreateDemoLeadDto } from './dto/create-demo-lead.dto';
import { RunDemoDto } from './dto/run-demo.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// ─── Hindi amount approximation ──────────────────────────────────────────────
// Converts exact rupee amounts to natural spoken Hindi approximations.
// e.g. 130000 → "ek lakh se dedh lakh ke beech"
// Customers get frustrated by long exact numbers — round figures feel more natural.
function amountToHindi(amount: number): string {
  if (amount <= 0) return 'kuch amount';
  if (amount < 10000) {
    const k = Math.round(amount / 1000);
    return `${k} hazaar rupaye`;
  }
  if (amount < 25000) return 'das se paachees hazaar rupaye ke beech';
  if (amount < 40000) return 'paachees se chaalis hazaar rupaye ke beech';
  if (amount < 60000) return 'lagbhag pachaas hazaar rupaye';
  if (amount < 80000) return 'pachaas se pauchhaatar hazaar rupaye ke beech';
  if (amount < 100000) return 'pauv lakh se ek lakh ke beech';
  if (amount < 125000) return 'lagbhag ek lakh rupaye';
  if (amount < 175000) return 'ek lakh se dedh lakh ke beech';
  if (amount < 225000) return 'lagbhag do lakh rupaye';
  if (amount < 275000) return 'do lakh se dhai lakh ke beech';
  if (amount < 350000) return 'teen lakh ke karib';
  if (amount < 450000) return 'teen se chaar lakh ke beech';
  if (amount < 550000) return 'lagbhag paanch lakh rupaye';
  if (amount < 750000) return 'paanch se saat lakh ke beech';
  if (amount < 1000000) return 'saat lakh se das lakh ke beech';
  const lakhs = Math.round(amount / 100000);
  return `lagbhag ${lakhs} lakh rupaye`;
}

// ─── Segment-specific call scripts ───────────────────────────────────────────
// Each segment has STRICT boundaries. Agent must NOT use language from a higher segment.
const SEGMENT_INSTRUCTIONS: Record<string, string> = {
  'Soft Reminder': `
SEGMENT: Soft Reminder

ONLY DO THESE TWO THINGS — NOTHING ELSE:
1. Tell customer that {due_amount_hindi} is pending.
2. Ask "कब तक clear हो सकता है?"

THAT IS ALL. No pressure. No probing. No firmness.

If customer gives ANY answer (date, week, month, anything) — say "ठीक है जी, note कर लिया। शुक्रिया।" and close immediately.
If customer gives no answer — say "कोई बात नहीं जी। हम फिर touch में रहेंगे।" and close.
NEVER ask for a more specific date. NEVER probe further. NEVER add extra sentences.`,

  'Follow-up': `
SEGMENT: Follow-up

DO THESE THINGS:
1. Tell customer {due_amount_hindi} is pending.
2. Mention you had reached out before (once, briefly).
3. Ask for a date — week, specific date, anything. Use this angle: "घड़ी घड़ी परेशान न करूँ आपको, बस एक date मिल जाए।"

If customer gives ANY timeframe (ek hafte, kal, 2-3 din) — confirm calculated date and close. STOP. Do not probe further.
If customer gives truly vague answer ("जल्दी", "देखते हैं") — ask once more gently for a rough date.
If still no date — close warmly.`,

  'Strong Follow-up': `
SEGMENT: Strong Follow-up

DO THESE THINGS:
1. Tell customer {due_amount_hindi} is pending.
2. Mention you have tried reaching out multiple times.
3. Ask for a date firmly but respectfully — "घड़ी घड़ी परेशान न करूँ आपको, बस एक date मिल जाए।"
4. You can mention accounts team is following up and asking for an update.

If customer gives ANY timeframe — confirm calculated date and close. STOP.
If truly vague — ask once more for a rough date.
If still no date — close warmly.

DO NOT mention boss pressure or seniors — that is Escalation only.`,

  'Escalation': `
SEGMENT: Escalation

TONE: Warm, pleading, genuinely requesting. As if there is pressure from your boss and you personally do not want this to go further.

DO THESE THINGS:
1. Tell customer {due_amount_hindi} is pending.
2. Mention your seniors are now asking about this account personally.
3. Say you personally do not want this to go further — you are requesting as a personal favour.
4. Accept ANY commitment — full amount, partial, any date, any timeframe — gratefully.

SAMPLE LINES:
"मेरे seniors अब personally पूछ रहे हैं इस account के बारे में।"
"मैं personally नहीं चाहती यह आगे बढ़े — आप हमारे valued client हैं।"
"चाहे थोड़ा भी हो जाए आज — मैं personally handle कर लूँगी।"

If customer gives ANY commitment — accept warmly and close immediately.`,
};

function buildSegmentInstructions(segment: string): string {
  return SEGMENT_INSTRUCTIONS[segment] ?? SEGMENT_INSTRUCTIONS['Soft Reminder'];
}

// IST greeting based on time of call — server runs UTC, IST = UTC+5:30
function getISTGreeting(): string {
  const nowUTC = new Date();
  const istMinutes = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes() + 330;
  const istHour = Math.floor(istMinutes / 60) % 24;
  if (istHour >= 5 && istHour < 12) return 'Good morning';
  if (istHour >= 12 && istHour < 17) return 'Good afternoon';
  if (istHour >= 17 && istHour < 21) return 'Good evening';
  return 'Hello';
}

function buildCallHistorySummary(
  history: Array<{ call_summary: string | null; disposition: string | null; promise_date: Date | null }>,
  segment: string,
): string {
  if (segment === 'Soft Reminder' || history.length === 0) return '';

  const lines = history.map((h, i) => {
    const num = i + 1;
    const disp = h.disposition ? `(${h.disposition})` : '';
    const summary = h.call_summary ?? 'Call hua tha, detailed summary unavailable';
    const ptp = h.promise_date
      ? ` Payment date promised: ${h.promise_date.toLocaleDateString('en-IN')}.`
      : '';
    return `Attempt ${num} ${disp}: ${summary}${ptp}`;
  });

  return `Previous contact history (mention briefly and naturally in conversation): ${lines.join(' | ')}`;
}

@Injectable()
export class DemoService {
  constructor(
    private readonly demoLeadRepo: DemoLeadRepository,
    private readonly jwtService: JwtService,
    @InjectQueue('outbound-calls') private readonly callingQueue: Queue,
  ) {}

  async createLead(dto: CreateDemoLeadDto) {
    let lead = await this.demoLeadRepo.findByPhone(dto.phone);

    if (!lead) {
      lead = await this.demoLeadRepo.create({
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        business_name: dto.businessName,
        business_type: dto.businessType,
        group_name: dto.groupName,
        reference_by: dto.referenceBy,
        parties_range: dto.partiesRange,
        outstanding_range: dto.outstandingRange,
      });
    } else {
      lead = await this.demoLeadRepo.update(lead.id, {
        name: dto.name,
        email: dto.email,
        business_name: dto.businessName,
        business_type: dto.businessType,
        group_name: dto.groupName,
        reference_by: dto.referenceBy,
        parties_range: dto.partiesRange,
        outstanding_range: dto.outstandingRange,
      });
    }

    const payload = { sub: lead.id, type: 'demo_token' };
    const demoToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { id: lead.id, demoToken };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'demo_token') throw new Error();
      const lead = await this.demoLeadRepo.findById(payload.sub);
      if (!lead) throw new UnauthorizedException('Demo lead not found');
      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        businessName: lead.business_name,
        whatsappUsed: lead.whatsapp_used,
        whatsappAllowed: lead.whatsapp_allowed,
        callsUsed: lead.calls_used,
        callsAllowed: lead.calls_allowed,
        status: lead.status,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired demo token');
    }
  }

  async getRunsForLead(token: string) {
    const payload = this.jwtService.verify(token);
    return this.demoLeadRepo.findRunsByLeadId(payload.sub);
  }

  async runDemo(token: string, dto: RunDemoDto) {
    const payload = this.jwtService.verify(token);
    const lead = await this.demoLeadRepo.findById(payload.sub);
    if (!lead) throw new UnauthorizedException('Demo lead not found');

    const isWhatsapp = dto.demoType === 'WHATSAPP';
    const isCall = dto.demoType === 'VOICE_CALL';

    if (isWhatsapp && lead.whatsapp_used >= lead.whatsapp_allowed)
      throw new BadRequestException('WhatsApp demo limit reached');
    if (isCall && lead.calls_used >= lead.calls_allowed)
      throw new BadRequestException('Call demo limit reached');

    // Sensitive situation cooldown — 18 days, overrides everything
    if (isCall) {
      const sensitiveCooldown = await this.demoLeadRepo.findActiveSensitiveCooldown(lead.id, dto.partyName);
      if (sensitiveCooldown?.sensitive_cooldown_until) {
        const daysLeft = Math.ceil(
          (sensitiveCooldown.sensitive_cooldown_until.getTime() - Date.now()) / 86400000,
        );
        throw new BadRequestException(
          `This party mentioned a sensitive situation. Calling paused for ${daysLeft} more day${daysLeft !== 1 ? 's' : ''} out of respect.`,
        );
      }
    }

    // NOTE: 60-min same-number cooldown is enforced at the campaign/bulk-call level
    // in production — NOT in the demo flow. Demo allows unlimited calls.

    // Rule 2: Call history for this party (skip for Soft Reminder)
    const callHistory =
      isCall && dto.segment !== 'Soft Reminder'
        ? await this.demoLeadRepo.findCallHistoryForParty(lead.id, dto.partyName)
        : [];

    const histSummary = buildCallHistorySummary(callHistory, dto.segment);
    const segmentInstructions = buildSegmentInstructions(dto.segment);

    // Rule 1: Multi-invoice — use total across all bills, not just current bill
    const isMultiInvoice =
      !!(dto.totalDueForParty && dto.maxDaysForParty && dto.totalDueForParty !== dto.dueAmount);
    const effectiveDueAmount = isMultiInvoice ? (dto.totalDueForParty ?? dto.dueAmount) : dto.dueAmount;
    const effectiveDays = isMultiInvoice ? (dto.maxDaysForParty ?? dto.daysOverdue) : dto.daysOverdue;

    const multiInvoiceNote = isMultiInvoice
      ? `IMPORTANT — Multiple bills pending for this party: Total due across all invoices is ${amountToHindi(effectiveDueAmount)}. The oldest bill is ${effectiveDays} din se pending hai. In conversation, mention the TOTAL amount (${amountToHindi(effectiveDueAmount)}) and say "kai bills pending hain aapke". Do NOT mention any specific bill number.`
      : '';

    // Rule 5: Partial payment — acknowledge what was paid, then mention remainder
    const partialPaymentNote =
      dto.previousPaidAmount && dto.totalOriginalAmount
        ? `Partial payment context: Customer had already paid ${amountToHindi(dto.previousPaidAmount)} earlier against this account (original was ${amountToHindi(dto.totalOriginalAmount)}). Acknowledge this warmly first: "Aapne pehle ${amountToHindi(dto.previousPaidAmount)} diye the — bahut shukriya ji." Phir bolo: "Abhi bhi ${amountToHindi(dto.dueAmount)} pending hai." Do NOT mention bill number.`
        : '';

    // Compute Hindi amount for the effective due (total if multi-invoice, single if not)
    const dueAmountHindi = amountToHindi(effectiveDueAmount);

    // If overdue > 90 days, build a natural mention for the agent to use
    const daysMention = effectiveDays > 90
      ? `90 din se zyada ho gaye hain — aur abhi ${effectiveDays} din ho gaye hain.`
      : '';

    const run = await this.demoLeadRepo.createRun({
      demo_lead: { connect: { id: lead.id } },
      demo_type: dto.demoType,
      party_name: dto.partyName,
      bill_amount: dto.dueAmount,
      status: 'PENDING',
    });

    const newWhatsappUsed = lead.whatsapp_used + (isWhatsapp ? 1 : 0);
    const newCallsUsed = lead.calls_used + (isCall ? 1 : 0);
    const exhausted =
      newWhatsappUsed >= lead.whatsapp_allowed && newCallsUsed >= lead.calls_allowed;

    const updatedLead = await this.demoLeadRepo.update(lead.id, {
      whatsapp_used: newWhatsappUsed,
      calls_used: newCallsUsed,
      status: exhausted ? 'EXHAUSTED' : 'SIGNED_UP',
    });

    // TODO: WhatsApp Cloud API integration
    if (isWhatsapp) { /* placeholder */ }

    if (isCall) {
      await this.callingQueue.add('outbound-calls', {
        demoLeadId: lead.id,
        phoneNumber: lead.phone,
        context: {
          business_name: lead.business_name,
          customer_name: dto.partyName,
          due_amount: effectiveDueAmount.toLocaleString('en-IN'),
          due_amount_hindi: dueAmountHindi,
          days_overdue: effectiveDays.toString(),
          segment: dto.segment,
          segment_instructions: segmentInstructions,
          call_history_summary: histSummary,
          multi_invoice_note: multiInvoiceNote,
          partial_payment_note: partialPaymentNote,
          handoff_number: process.env.BOLNA_HANDOFF_NUMBER || '',
          greeting_time: getISTGreeting(),
          days_mention: daysMention,
        },
      });
    }

    return {
      success: true,
      demoRunId: run.id,
      message: 'Call queued — your phone should ring shortly',
      whatsappRemaining: updatedLead.whatsapp_allowed - updatedLead.whatsapp_used,
      callsRemaining: updatedLead.calls_allowed - updatedLead.calls_used,
    };
  }
}
