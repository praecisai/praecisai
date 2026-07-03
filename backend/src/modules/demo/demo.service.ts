import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DemoLeadRepository } from './demo-lead.repository';
import { CreateDemoLeadDto } from './dto/create-demo-lead.dto';
import { RunDemoDto } from './dto/run-demo.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import OpenAI from 'openai';

// ─── Hindi number words for multiples of 5 (in thousands) — 5 to 95 ──────────
const THOUSAND_WORDS: Record<number, string> = {
  5: 'पाँच', 10: 'दस', 15: 'पंद्रह', 20: 'बीस', 25: 'पच्चीस',
  30: 'तीस', 35: 'पैंतीस', 40: 'चालीस', 45: 'पैंतालीस', 50: 'पचास',
  55: 'पचपन', 60: 'साठ', 65: 'पैंसठ', 70: 'सत्तर', 75: 'पचहत्तर',
  80: 'अस्सी', 85: 'पचासी', 90: 'नब्बे', 95: 'पंचानवे', 100: 'सौ',
};

// ─── Hindi amount approximation ──────────────────────────────────────────────
// Converts exact rupee amounts to clean spoken Hindi — always rounded UP to
// the nearest ₹5,000 for amounts under 1 lakh. DB and UI keep the exact amount;
// only the spoken value on calls is rounded — customers get frustrated by exact figures.
function amountToHindi(amount: number): string {
  if (amount <= 0) return 'कुछ amount';

  if (amount < 100000) {
    const roundedThousands = Math.min(100, Math.ceil(amount / 5000) * 5);
    const word = THOUSAND_WORDS[roundedThousands];
    if (roundedThousands === 100) return 'लगभग एक लाख रुपये';
    return `लगभग ${word} हज़ार रुपये`;
  }

  if (amount < 137500) return 'सवा लाख रुपये';
  if (amount < 162500) return 'डेढ़ लाख रुपये';
  if (amount < 187500) return 'पौने दो लाख रुपये';
  if (amount < 212500) return 'लगभग दो लाख रुपये';
  if (amount < 237500) return 'सवा दो लाख रुपये';
  if (amount < 262500) return 'ढाई लाख रुपये';
  if (amount < 312500) return 'लगभग तीन लाख रुपये';
  if (amount < 375000) return 'सवा तीन लाख रुपये';
  if (amount < 437500) return 'लगभग चार लाख रुपये';
  if (amount < 475000) return 'साढ़े चार लाख रुपये';
  if (amount < 550000) return 'लगभग पाँच लाख रुपये';
  if (amount < 650000) return 'लगभग छह लाख रुपये';
  if (amount < 750000) return 'लगभग सात लाख रुपये';
  if (amount < 850000) return 'लगभग आठ लाख रुपये';
  if (amount < 950000) return 'लगभग नौ लाख रुपये';
  if (amount < 1100000) return 'लगभग दस लाख रुपये';
  const lakhs = Math.round(amount / 100000);
  return `लगभग ${lakhs} लाख रुपये`;
}

// ─── Hindi cardinal number words (1-99) — for speaking counts like "days overdue" ──
const HINDI_CARDINALS: Record<number, string> = {
  1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पाँच',
  6: 'छह', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस',
  11: 'ग्यारह', 12: 'बारह', 13: 'तेरह', 14: 'चौदह', 15: 'पंद्रह',
  16: 'सोलह', 17: 'सत्रह', 18: 'अठारह', 19: 'उन्नीस', 20: 'बीस',
  21: 'इक्कीस', 22: 'बाईस', 23: 'तेईस', 24: 'चौबीस', 25: 'पच्चीस',
  26: 'छब्बीस', 27: 'सत्ताईस', 28: 'अट्ठाईस', 29: 'उनतीस', 30: 'तीस',
  31: 'इकतीस', 32: 'बत्तीस', 33: 'तैंतीस', 34: 'चौंतीस', 35: 'पैंतीस',
  36: 'छत्तीस', 37: 'सैंतीस', 38: 'अड़तीस', 39: 'उनतालीस', 40: 'चालीस',
  41: 'इकतालीस', 42: 'बयालीस', 43: 'तैंतालीस', 44: 'चौंतालीस', 45: 'पैंतालीस',
  46: 'छियालीस', 47: 'सैंतालीस', 48: 'अड़तालीस', 49: 'उनचास', 50: 'पचास',
  51: 'इक्यावन', 52: 'बावन', 53: 'तिरपन', 54: 'चौवन', 55: 'पचपन',
  56: 'छप्पन', 57: 'सत्तावन', 58: 'अट्ठावन', 59: 'उनसठ', 60: 'साठ',
  61: 'इकसठ', 62: 'बासठ', 63: 'तिरसठ', 64: 'चौंसठ', 65: 'पैंसठ',
  66: 'छियासठ', 67: 'सड़सठ', 68: 'अड़सठ', 69: 'उनहत्तर', 70: 'सत्तर',
  71: 'इकहत्तर', 72: 'बहत्तर', 73: 'तिहत्तर', 74: 'चौहत्तर', 75: 'पचहत्तर',
  76: 'छिहत्तर', 77: 'सतहत्तर', 78: 'अठहत्तर', 79: 'उनासी', 80: 'अस्सी',
  81: 'इक्यासी', 82: 'बयासी', 83: 'तिरासी', 84: 'चौरासी', 85: 'पचासी',
  86: 'छियासी', 87: 'सत्तासी', 88: 'अट्ठासी', 89: 'नवासी', 90: 'नब्बे',
  91: 'इक्यानवे', 92: 'बानवे', 93: 'तिरानवे', 94: 'चौरानवे', 95: 'पंचानवे',
  96: 'छियानवे', 97: 'सत्तानवे', 98: 'अट्ठानवे', 99: 'निन्यानवे',
};

// Sarvam Bulbul reads bare digits ("95") in English rather than Hindi words —
// any count spoken on a call must go through this, never interpolated raw.
function numberToHindiWords(num: number): string {
  const n = Math.round(num);
  if (n <= 0) return 'शून्य';
  if (n <= 99) return HINDI_CARDINALS[n];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const hundredsWord = `${HINDI_CARDINALS[hundreds]} सौ`;
  return remainder === 0 ? hundredsWord : `${hundredsWord} ${HINDI_CARDINALS[remainder]}`;
}

// ─── Proper case for TTS — converts "PATEL ENTERPRISES" to "Patel Enterprises"
// All-caps names sound robotic when TTS reads them. Proper case sounds natural.
function toProperCase(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Name → Devanagari transliteration for natural TTS ───────────────────────
// Sarvam Bulbul v2 is an Indic (Hindi) TTS. Roman-script names inside a Hindi
// context get mangled (e.g. "Walavalkar" read as disjoint syllables). Feeding the
// name in Devanagari makes the voice pronounce it the way an Indian speaker would.
// A small local map covers the most common surnames/company words at zero cost;
// anything else uses a fast gpt-4o-mini transliteration, falling back to proper-case
// Roman if the LLM is unavailable or returns nothing usable.
let _openaiClient: OpenAI | null | undefined;
function getOpenAI(): OpenAI | null {
  if (_openaiClient !== undefined) return _openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  _openaiClient = apiKey ? new OpenAI({ apiKey }) : null;
  return _openaiClient;
}

// Guaranteed-correct Devanagari for very common name tokens (case-insensitive).
const NAME_TOKEN_MAP: Record<string, string> = {
  sharma: 'शर्मा', gupta: 'गुप्ता', patel: 'पटेल', singh: 'सिंह', kumar: 'कुमार',
  verma: 'वर्मा', agarwal: 'अग्रवाल', jain: 'जैन', mehta: 'मेहता', shah: 'शाह',
  reddy: 'रेड्डी', nair: 'नायर', iyer: 'अय्यर', yadav: 'यादव', mishra: 'मिश्रा',
  tiwari: 'तिवारी', pandey: 'पांडे', chauhan: 'चौहान', rathore: 'राठौड़', bhatt: 'भट्ट',
  rao: 'राव', shetty: 'शेट्टी', menon: 'मेनन', joshi: 'जोशी', kulkarni: 'कुलकर्णी',
  patil: 'पाटिल', naik: 'नाईक', khan: 'ख़ान', merchant: 'मर्चेंट', fernandes: 'फर्नांडिस',
  enterprises: 'एंटरप्राइजेज', distributors: 'डिस्ट्रीब्यूटर्स', traders: 'ट्रेडर्स',
  industries: 'इंडस्ट्रीज', solutions: 'सॉल्यूशंस', brothers: 'ब्रदर्स',
  associates: 'असोसिएट्स', international: 'इंटरनेशनल', agency: 'एजेंसी', group: 'ग्रुप',
};

// Curated Devanagari for common Indian business cities (case-insensitive).
const CITY_MAP: Record<string, string> = {
  mumbai: 'मुंबई', pune: 'पुणे', delhi: 'दिल्ली', 'new delhi': 'नई दिल्ली',
  bangalore: 'बेंगलुरु', bengaluru: 'बेंगलुरु', hyderabad: 'हैदराबाद',
  ahmedabad: 'अहमदाबाद', surat: 'सूरत', chennai: 'चेन्नई', kolkata: 'कोलकाता',
  jaipur: 'जयपुर', lucknow: 'लखनऊ', kanpur: 'कानपुर', nagpur: 'नागपुर',
  indore: 'इंदौर', bhopal: 'भोपाल', patna: 'पटना', vadodara: 'वडोदरा',
  ludhiana: 'लुधियाना', agra: 'आगरा', nashik: 'नासिक', rajkot: 'राजकोट',
  coimbatore: 'कोयंबटूर', kochi: 'कोच्चि', chandigarh: 'चंडीगढ़',
  gurgaon: 'गुरुग्राम', gurugram: 'गुरुग्राम', noida: 'नोएडा',
};

async function transliterateCityToDevanagari(city: string): Promise<string> {
  if (!city) return '';
  const key = city.trim().toLowerCase();
  if (CITY_MAP[key]) return CITY_MAP[key];
  return transliterateNameToDevanagari(city);
}

async function transliterateNameToDevanagari(name: string): Promise<string> {
  const proper = toProperCase(name);
  const tokens = proper.split(/\s+/).filter(Boolean);

  // Fast path: every token is a known common name/company word.
  if (tokens.every(t => NAME_TOKEN_MAP[t.toLowerCase()])) {
    return tokens.map(t => NAME_TOKEN_MAP[t.toLowerCase()]).join(' ');
  }

  const client = getOpenAI();
  if (!client) return proper;

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 60,
      messages: [
        {
          role: 'system',
          content:
            'You transliterate Indian personal and business names from Roman script into Devanagari for a Hindi text-to-speech engine. Output ONLY the Devanagari transliteration — no translation, no explanation, no quotes, no extra text. Preserve every word including surnames and company words (Enterprises, Traders, Industries, LLP, Pvt Ltd). Use the natural Hindi pronunciation an Indian speaker would use.',
        },
        { role: 'user', content: proper },
      ],
    });
    const out = res.choices[0]?.message?.content?.trim();
    // Must contain Devanagari to be trustworthy; else fall back to Roman.
    return out && /[ऀ-ॿ]/.test(out) ? out : proper;
  } catch {
    return proper;
  }
}

// ─── Segment-specific call scripts ───────────────────────────────────────────
// Each segment has STRICT boundaries. Agent must NOT use language from a higher segment.
const SEGMENT_INSTRUCTIONS: Record<string, string> = {
  'Soft Reminder': `
SEGMENT: Soft Reminder

ONLY DO THESE TWO THINGS — NOTHING ELSE:
1. Tell customer that {due_amount_hindi} is pending.
2. Ask "आप please बताइए, कब तक clear हो सकता है?"

THAT IS ALL. No pressure. No probing. No firmness.

If customer gives ANY answer (date, week, month, anything) — say EXACTLY "ठीक है जी, note कर लिया। {business_name} की तरफ से, आपका दिन शुभ हो।" then say NOTHING more, no matter what the customer says.
If customer gives no answer — say EXACTLY "कोई बात नहीं जी। हम फिर touch में रहेंगे। {business_name} की तरफ से, आपका दिन शुभ हो।" then say NOTHING more.
NEVER ask for a more specific date. NEVER probe further. NEVER add extra sentences.`,

  'Follow-up': `
SEGMENT: Follow-up

TONE: friendly, gentle reminder — you had contact before, this is just a soft follow-up. Never firm, never pressuring.

DO THESE THINGS:
1. Tell customer {due_amount_hindi} is pending.
2. Briefly mention you had spoken before (once).
3. Ask warmly for a rough/expected date. Approximate is completely fine.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise):
"Sir, यह एक छोटा सा follow-up call है।"
"पिछली बार हमारी बात हुई थी।"
"अगर approximate date भी हो, तो चलेगा।"
"आप please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

If customer gives ANY timeframe (एक हफ्ते, कल, दो-तीन दिन) — say EXACTLY: "बिल्कुल sir। मैं note कर लेती हूँ। {business_name} की तरफ से, आपका दिन शुभ हो।" Then say NOTHING more, no matter what the customer says. Do not probe further.
If customer gives truly vague answer ("जल्दी", "देखते हैं") — ask once more gently for a rough date.
If still no date — say EXACTLY: "कोई बात नहीं sir, हम समझते हैं। {business_name} की तरफ से, आपका दिन शुभ हो।" Then say NOTHING more.`,

  'Strong Follow-up': `
SEGMENT: Strong Follow-up

TONE: firm but respectful — accounts team is asking you for an update. Always a request, never a demand or threat.

MANDATORY ORDER — deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. Accounts team is asking you for an update on this payment.
3. ASK the payment date — this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the partial-payment thanks, and the accounts-team update are INFORMATIONAL — they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise):
"Sir, मेरी तरफ से, एक request थी।"
"Accounts team मुझसे इस payment का update पूछ रही है।"
"अगर possible हो, please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

If customer gives ANY timeframe — capture it, then say EXACTLY: "बिल्कुल sir। मैं note कर लेती हूँ। {business_name} की तरफ से, आपका दिन शुभ हो।" Then say NOTHING more, no matter what the customer says. If truly vague — ask once more for a rough date.
NEVER mention legal action, threats, seniors, or boss pressure (seniors = Escalation only).`,

  'Escalation': `
SEGMENT: Escalation

Highest recovery stage. TONE: warm, humble, genuinely requesting — internal follow-up is really happening, but NO threat, NO legal mention, NO rudeness. Always remain humble.

MANDATORY ORDER — deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. Accounts team and seniors are asking about this account's status; you must give them an update.
3. ASK the payment date — this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the thanks, and the seniors' follow-up are INFORMATIONAL — they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise):
"Sir, मेरी तरफ से, एक छोटी सी request है।"
"Accounts team मुझसे update पूछ रही है।"
"Seniors भी status जानना चाहते हैं।"
"मुझे उनको एक update देना है।"
"अगर possible हो, please बता दीजिए, लगभग कब तक payment clear हो जाएगी?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

If customer gives ANY commitment — say EXACTLY: "बिल्कुल sir। मैं note कर लेती हूँ। {business_name} की तरफ से, आपका दिन शुभ हो।" Then say NOTHING more, no matter what the customer says. NEVER threaten or pressure.`,
};

// Resolves {business_name} here rather than leaving it for Bolna's template pass —
// this string becomes the VALUE of {segment_instructions}, so a nested {business_name}
// inside it is not guaranteed to survive Bolna's substitution on the outer prompt.
function buildSegmentInstructions(segment: string, businessName: string): string {
  const template = SEGMENT_INSTRUCTIONS[segment] ?? SEGMENT_INSTRUCTIONS['Soft Reminder'];
  return template.replace(/\{business_name\}/g, businessName);
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
        city: dto.city,
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
        city: dto.city,
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

  // ─── Bolna credits for the demo dashboard ──────────────────────────────────
  // Bolna's /me endpoint returns the wallet in US cents (e.g. -43.07 = -$0.43
  // on the dashboard; verified against the dashboard on 2026-07-04). Same unit
  // as total_cost on executions.
  private creditsCache: { data: object; fetchedAt: number } | null = null;

  async getCredits(token: string) {
    // Admin-only: platform balances are shown only on the owner's own demo
    // dashboard, matched by lead phone (last 10 digits, prefix-insensitive).
    const payload = this.jwtService.verify(token);
    const lead = await this.demoLeadRepo.findById(payload.sub);
    const adminPhone = (process.env.DEMO_ADMIN_PHONE || '9653665909').replace(/\D/g, '').slice(-10);
    const leadPhone = (lead?.phone || '').replace(/\D/g, '').slice(-10);
    if (!leadPhone || leadPhone !== adminPhone) {
      throw new UnauthorizedException('Credits are not available for this dashboard');
    }

    if (this.creditsCache && Date.now() - this.creditsCache.fetchedAt < 60_000) {
      return this.creditsCache.data;
    }

    const headers = { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` };
    const meRes = await fetch('https://api.bolna.dev/me', { headers });
    if (!meRes.ok) throw new BadRequestException('Could not fetch Bolna credits');
    const me = await meRes.json();
    const balanceUsd = Math.round(me.wallet) / 100;

    // Average per-call cost from recent executions (total_cost is in US cents)
    let avgCallCostUsd: number | null = null;
    try {
      const exRes = await fetch(
        `https://api.bolna.dev/v2/agent/${process.env.BOLNA_AGENT_ID}/executions?page_size=5`,
        { headers },
      );
      if (exRes.ok) {
        const ex = await exRes.json();
        const items: any[] = Array.isArray(ex) ? ex : (ex?.data ?? []);
        const costs = items
          .map((e) => e?.total_cost)
          .filter((c): c is number => typeof c === 'number' && c > 0);
        if (costs.length) {
          avgCallCostUsd = costs.reduce((s, c) => s + c, 0) / costs.length / 100;
        }
      }
    } catch {
      // estimate is optional — balance alone is still useful
    }

    // Deepgram balance (STT bills the connected Deepgram account directly).
    // Sarvam has no balance API — its credits are dashboard-only.
    let deepgramUsd: number | null = null;
    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (dgKey) {
      try {
        const dgHeaders = { Authorization: `Token ${dgKey}` };
        const projRes = await fetch('https://api.deepgram.com/v1/projects', { headers: dgHeaders });
        if (projRes.ok) {
          const projects = (await projRes.json())?.projects ?? [];
          if (projects[0]?.project_id) {
            const balRes = await fetch(
              `https://api.deepgram.com/v1/projects/${projects[0].project_id}/balances`,
              { headers: dgHeaders },
            );
            if (balRes.ok) {
              const balances: any[] = (await balRes.json())?.balances ?? [];
              deepgramUsd =
                Math.round(balances.reduce((s, b) => s + (Number(b?.amount) || 0), 0) * 100) / 100;
            }
          }
        }
      } catch {
        // Deepgram balance is optional
      }
    }

    const data = {
      balanceUsd,
      avgCallCostUsd: avgCallCostUsd !== null ? Math.round(avgCallCostUsd * 1000) / 1000 : null,
      estCallsLeft:
        avgCallCostUsd !== null && avgCallCostUsd > 0
          ? Math.max(0, Math.floor(balanceUsd / avgCallCostUsd))
          : null,
      deepgramUsd,
    };
    this.creditsCache = { data, fetchedAt: Date.now() };
    return data;
  }

  async runDemo(token: string, dto: RunDemoDto) {
    const payload = this.jwtService.verify(token);
    const lead = await this.demoLeadRepo.findById(payload.sub);
    if (!lead) throw new UnauthorizedException('Demo lead not found');

    const isWhatsapp = dto.demoType === 'WHATSAPP';
    const isCall = dto.demoType === 'VOICE_CALL';

    // 🚧 TEMP: quota guards disabled for testing
    // if (isWhatsapp && lead.whatsapp_used >= lead.whatsapp_allowed)
    //   throw new BadRequestException('WhatsApp demo limit reached');
    // if (isCall && lead.calls_used >= lead.calls_allowed)
    //   throw new BadRequestException('Call demo limit reached');

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
    const segmentInstructions = buildSegmentInstructions(dto.segment, lead.business_name);

    // Rule 1: Multi-invoice — use total across all bills, not just current bill
    const isMultiInvoice =
      !!(dto.totalDueForParty && dto.maxDaysForParty && dto.totalDueForParty !== dto.dueAmount);
    const effectiveDueAmount = isMultiInvoice ? (dto.totalDueForParty ?? dto.dueAmount) : dto.dueAmount;
    const effectiveDays = isMultiInvoice ? (dto.maxDaysForParty ?? dto.daysOverdue) : dto.daysOverdue;

    const multiInvoiceNote = isMultiInvoice
      ? `IMPORTANT — Multiple bills pending for this party: Total due across all invoices is ${amountToHindi(effectiveDueAmount)}. The oldest bill is ${numberToHindiWords(effectiveDays)} दिन से pending है. In conversation, mention the TOTAL amount (${amountToHindi(effectiveDueAmount)}) and say "कई bills pending हैं आपके।" Do NOT mention any specific bill number.`
      : '';

    // Rule 5: Partial payment — acknowledge what was paid, then mention remainder
    const partialPaymentNote =
      dto.previousPaidAmount && dto.totalOriginalAmount
        ? `Partial payment context: Customer had already paid ${amountToHindi(dto.previousPaidAmount)} earlier against this account (original was ${amountToHindi(dto.totalOriginalAmount)}). Acknowledge this warmly first: "आपने पहले ${amountToHindi(dto.previousPaidAmount)} दिए थे, बहुत शुक्रिया जी।" फिर बोलो: "अभी भी ${amountToHindi(dto.dueAmount)} pending है।" Do NOT mention bill number.`
        : '';

    // Compute Hindi amount for the effective due (total if multi-invoice, single if not)
    const dueAmountHindi = amountToHindi(effectiveDueAmount);

    // If overdue > 90 days, build a natural mention for the agent to use
    const daysMention = effectiveDays > 90
      ? `यह payment ${numberToHindiWords(effectiveDays)} दिन से pending है।`
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
      // Convert the party name and city to Devanagari so Sarvam Bulbul pronounces them naturally.
      const [customerNameSpoken, businessCitySpoken] = await Promise.all([
        transliterateNameToDevanagari(dto.partyName),
        transliterateCityToDevanagari(lead.city || ''),
      ]);

      await this.callingQueue.add('outbound-calls', {
        demoLeadId: lead.id,
        phoneNumber: lead.phone,
        context: {
          business_name: lead.business_name,
          business_city: businessCitySpoken,
          customer_name: customerNameSpoken,
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
