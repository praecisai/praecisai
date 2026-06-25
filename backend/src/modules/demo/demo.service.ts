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
// IMPORTANT: Never mention bill number. Use {{due_amount_hindi}} for amounts.
// Agent speaks slowly, natural pauses, proper Hinglish.
const SEGMENT_INSTRUCTIONS: Record<string, string> = {
  'Soft Reminder': `Yeh pehli call hai. Light and polite — sirf inform karo, koi pressure nahi.
IMPORTANT: Bill number kabhi mat bolna. Sirf amount aur time mention karo.
Script guidance: "Aapka {{due_amount_hindi}} pending hai jo kuch samay se clear nahi hua. Main bas ek chota sa reminder dena chahti thi. Kab tak aap arrange kar sakte hain?"
Agar date milti hai — warmly note kar lo. Agar nahi — "Koi baat nahi ji, aap note kar lijiye. Hum phir contact karenge." Bahut short call — 60-90 seconds enough hai.`,

  'Follow-up': `Pehle reminder ja chuka hai. Ab specific date maango.
IMPORTANT: Bill number kabhi mat bolna.
Script guidance: "{{customer_name}} ji, aapko pehle bhi ek baar humari taraf se message gaya tha. Main chahti hoon ki yeh jaldi resolve ho jaye taaki main aapko baar baar pareshaan na karun. {{due_amount_hindi}} pending hai — kya koi specific date bata sakte hain jab tak payment ho sakti hai?"
Agar date de — clearly confirm karo: "Theek hai ji, toh main [date] note kar leti hoon." Agar nahi — ek week suggest karo. Firm but warm.`,

  'Strong Follow-up': `Multiple contacts ho chuke hain. Ab firm ho jao — polite raho but clear commitment chahiye.
IMPORTANT: Bill number kabhi mat bolna.
Script guidance: "{{customer_name}} ji, humne pehle bhi kaafi baar try kiya aapko. Mujhe pata hai aap busy rehte hain, lekin {{due_amount_hindi}} kaafi time se pending hai. Main chahti hoon ki aaj koi pakka date fix ho jaye — warna mujhe apne seniors ko is baare mein inform karna padega."
Agar partial commitment bhi milti hai — accept karo. Agar nahi — next step clearly batao. No empty promises.`,

  'Escalation': `Final level. Warm pleading tone + genuine company pressure. Full history use karo briefly.
IMPORTANT: Bill number kabhi mat bolna.
Script guidance: "{{customer_name}} ji, main aapko honestly bol rahi hoon — mere superiors ka pressure aa raha hai is matter pe. Aap hamare valued customer hain aur main bilkul nahi chahti ki yeh aage badhe. {{due_amount_hindi}} — kya aaj kuch bhi arrangement ho sakti hai? Chahe thoda bhi ho?"
Partial payment bhi gracefully accept karo. Minimum ek firm date lo. Be genuine — customer ko feel hona chahiye ki aap unki help karna chahti hain, dhaman nahi.`,
};

function buildSegmentInstructions(segment: string): string {
  return SEGMENT_INSTRUCTIONS[segment] ?? SEGMENT_INSTRUCTIONS['Soft Reminder'];
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
          `This party mentioned a sensitive personal situation. Out of respect, calling is paused for ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}.`,
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
          handoff_number: process.env.RETELL_HANDOFF_NUMBER || '',
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
