import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DemoLeadRepository } from './demo-lead.repository';
import { CreateDemoLeadDto } from './dto/create-demo-lead.dto';
import { RunDemoDto } from './dto/run-demo.dto';
import { DEFAULT_STYLE } from './segment-styles';
import { buildPtpWindowNote, PTP_WINDOW_MONTHS } from '../../common/utils/call-script.util';
import { StatementPdfService } from '../whatsapp/statement-pdf.service';
import { AisensyService } from '../whatsapp/aisensy.service';
import { StorageService } from '../storage/storage.service';
import { JwtService } from '@nestjs/jwt';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import OpenAI from 'openai';

// ─── Hindi number words for multiples of 5 (in thousands): 5 to 95 ──────────
const THOUSAND_WORDS: Record<number, string> = {
  5: 'पाँच', 10: 'दस', 15: 'पंद्रह', 20: 'बीस', 25: 'पच्चीस',
  30: 'तीस', 35: 'पैंतीस', 40: 'चालीस', 45: 'पैंतालीस', 50: 'पचास',
  55: 'पचपन', 60: 'साठ', 65: 'पैंसठ', 70: 'सत्तर', 75: 'पचहत्तर',
  80: 'अस्सी', 85: 'पचासी', 90: 'नब्बे', 95: 'पंचानवे', 100: 'सौ',
};

// ─── Hindi amount approximation ──────────────────────────────────────────────
// Converts exact rupee amounts to clean spoken Hindi: always rounded UP to
// the nearest ₹5,000 for amounts under 1 lakh. DB and UI keep the exact amount;
// only the spoken value on calls is rounded: customers get frustrated by exact figures.
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

// ─── Hindi cardinal number words (1-99): for speaking counts like "days overdue" ──
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

// ─── Proper case for TTS: converts "PATEL ENTERPRISES" to "Patel Enterprises"
// All-caps names sound robotic when TTS reads them. Proper case sounds natural.
function toProperCase(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Hindi ordinal days + date formatting for spoken dates ───────────────────
const DAY_ORDINALS: Record<number, string> = {
  1: 'पहली', 2: 'दूसरी', 3: 'तीसरी', 4: 'चौथी', 5: 'पाँचवीं', 6: 'छठी',
  7: 'सातवीं', 8: 'आठवीं', 9: 'नौवीं', 10: 'दसवीं', 11: 'ग्यारहवीं', 12: 'बारहवीं',
  13: 'तेरहवीं', 14: 'चौदहवीं', 15: 'पंद्रहवीं', 16: 'सोलहवीं', 17: 'सत्रहवीं',
  18: 'अठारहवीं', 19: 'उन्नीसवीं', 20: 'बीसवीं', 21: 'इक्कीसवीं', 22: 'बाईसवीं',
  23: 'तेईसवीं', 24: 'चौबीसवीं', 25: 'पच्चीसवीं', 26: 'छब्बीसवीं', 27: 'सत्ताईसवीं',
  28: 'अट्ठाईसवीं', 29: 'उनतीसवीं', 30: 'तीसवीं', 31: 'इकतीसवीं',
};
const HINDI_MONTHS = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई',
  'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

// Format a Date as spoken Hindi: "[month] की [ordinal] तारीख" (IST).
function formatHindiDate(d: Date): string {
  const ist = new Date(d.getTime() + 330 * 60000);
  return `${HINDI_MONTHS[ist.getUTCMonth()]} की ${DAY_ORDINALS[ist.getUTCDate()]} तारीख`;
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
            'You transliterate Indian personal and business names from Roman script into Devanagari for a Hindi text-to-speech engine. Output ONLY the Devanagari transliteration: no translation, no explanation, no quotes, no extra text. Preserve every word including surnames and company words (Enterprises, Traders, Industries, LLP, Pvt Ltd). Use the natural Hindi pronunciation an Indian speaker would use.',
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
// Shared handling for outright refusal or a promise more than two months away.
// Checked BEFORE the normal "any timeframe → close" line, else "तीन महीने" would
// close instantly as just another timeframe.
const REFUSAL_GUARD = `FIRST, before closing, check this: if the customer REFUSES to pay ("मैं नहीं दूँगा", "नहीं दे पाऊँगा", "अभी नहीं होगा", "पैसे नहीं हैं"), OR gives a date MORE than two months away ("तीन महीने", "चार महीने बाद", "अगले साल"): do NOT thank, do NOT close yet. Ask gently, humbly, EXACTLY: "कोई खास परेशानी है, या आपकी बात seniors से करवा दूँ?" Never begin this line with an acknowledgement: no "जी बिल्कुल", no "मैं समझ सकती हूँ", no "ठीक है". The first word is "कोई". You may ask this line a MAXIMUM of THREE times in the whole call: if the customer refuses again after the third attempt, close warmly with "कोई बात नहीं जी, हम समझते हैं। Thank you so much." and say NOTHING more. Handle their reply after each attempt: death or medical or tragedy → give condolences and stop (do NOT say Thank you so much); financial or personal reason → "बिल्कुल समझती हूँ जी, कोई pressure नहीं है।" then say "Thank you so much." and stop; wants seniors → "बिल्कुल जी, मैं आपको अभी connect करती हूँ।" and connect; a sooner date (within two months) → "ठीक है जी। Thank you so much." and stop. If their turn also contains questions, answer every question first, then continue this step in the same response.`;

const SEGMENT_INSTRUCTIONS: Record<string, string> = {
  'Soft Reminder': `
SEGMENT: Soft Reminder

ONLY DO THESE TWO THINGS: NOTHING ELSE:
1. Tell customer that {due_amount_hindi} is pending.
2. Ask "आप please बताइए, कब तक clear हो सकता है?"

THAT IS ALL. No pressure. No probing. No firmness.

If customer gives ANY answer (date, week, month, anything): say EXACTLY "ठीक है जी। Thank you so much." then say NOTHING more, no matter what the customer says.
If customer gives no answer: say EXACTLY "कोई बात नहीं जी, हम समझते हैं। Thank you so much." then say NOTHING more.
NEVER ask for a more specific date. NEVER probe further. NEVER add extra sentences.`,

  'Follow-up': `
SEGMENT: Follow-up

TONE: friendly, gentle reminder: you had contact before, this is just a soft follow-up. Never firm, never pressuring.

DO THESE THINGS:
1. Tell customer {due_amount_hindi} is pending.
2. Ask warmly for a rough/expected date. Approximate is completely fine.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"यह एक छोटा सा follow-up call है, अगर approximate date भी हो तो चलेगा।"
"आप please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months (एक हफ्ते, कल, दो-तीन दिन, इस महीने): say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. Do not probe further.
If customer gives truly vague answer ("जल्दी", "देखते हैं"): ask once more gently for a rough date.
If still no date: say EXACTLY: "कोई बात नहीं जी, हम समझते हैं। Thank you so much." Then say NOTHING more.`,

  'Strong Follow-up': `
SEGMENT: Strong Follow-up

TONE: firm but respectful: accounts team is asking you for an update. Always a request, never a demand or threat.

MANDATORY ORDER: deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. Accounts team is asking you for an update on this payment.
3. ASK the payment date: this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the partial-payment thanks, and the accounts-team update are INFORMATIONAL: they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"मेरी तरफ से एक request थी, Accounts team मुझसे इस payment का update पूछ रही है।"
"अगर possible हो, please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months: capture it, then say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. If truly vague: ask once more for a rough date.
NEVER mention legal action, threats, seniors, or boss pressure (seniors = Escalation only).`,

  'Escalation': `
SEGMENT: Escalation

Highest recovery stage. TONE: warm, humble, genuinely requesting: internal follow-up is really happening, but NO threat, NO legal mention, NO rudeness. Always remain humble.

MANDATORY ORDER: deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. Accounts team and the senior team are asking about this account; you must give them an update.
3. ASK the payment date: this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the thanks, and the seniors' follow-up are INFORMATIONAL: they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"मेरी तरफ से एक छोटी सी request है, Accounts team मुझसे update पूछ रही है।"
"Senior team भी जानकारी चाहते हैं।"
"अगर possible हो, please बता दीजिए, लगभग कब तक payment clear हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal commitment within two months: say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. NEVER threaten or pressure.`,
};

// ─── Script styles (tone variants) ──────────────────────────────────────────
// Each demo agent maps to one style slug. The CORE canvas and the compliance
// scaffolding (REFUSAL_GUARD, the mandatory date question, the exact closing
// lines) are IDENTICAL across styles — only the flavour/persona lines change.
// This mirrors the customer's own script proposals, which create tone variety
// purely by rewriting the segment blocks while leaving the safety backbone
// untouched. 'formal' is the original, production-proven wording (default).
// The style slugs/labels live in ./segment-styles (shared with the admin panel).

// FRIENDLY (from the customer's v3 "Natural / Colloquial" proposal). Meena,
// female, warm and human. Identical scaffolding to 'formal' (REFUSAL_GUARD, the
// mandatory date question last, the exact closing lines) — only the flavour
// lines are warmer and more conversational.
const FRIENDLY_SEGMENTS: Record<string, string> = {
  'Soft Reminder': `
SEGMENT: Soft Reminder

TONE: like a warm, familiar person gently reminding you, not a company. Friendly and unhurried.

ONLY DO THESE TWO THINGS: NOTHING ELSE:
1. Warmly remind the customer a small payment, {due_amount_hindi}, is pending.
2. Ask gently "आप बस बता दीजिए, कब तक हो जाएगा जी?"

Speak warmly and simply, for example: "एक छोटी सी बात याद दिलानी थी जी, आपका {due_amount_hindi} का payment थोड़ा pending है।"

THAT IS ALL. No pressure. No probing. No firmness.

If customer gives ANY answer (date, week, month, anything): say EXACTLY "ठीक है जी। Thank you so much." then say NOTHING more, no matter what the customer says.
If customer gives no answer: say EXACTLY "कोई बात नहीं जी, हम समझते हैं। Thank you so much." then say NOTHING more.
NEVER ask for a more specific date. NEVER probe further. NEVER add extra sentences.`,

  'Follow-up': `
SEGMENT: Follow-up

TONE: warm, easy-going second check-in: you had contact before and are just lightly following up. Never firm, never pressuring. It is okay to sound human and relaxed.

DO THESE THINGS:
1. Warmly remind the customer {due_amount_hindi} is still pending.
2. Ask warmly for a rough/expected date. Approximate is completely fine.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"पहले भी हमारी थोड़ी बात हुई थी जी, बस उसी का हल्का सा follow-up है।"
"आप बेफिक्र होकर बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months (एक हफ्ते, कल, दो-तीन दिन, इस महीने): say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. Do not probe further.
If customer gives truly vague answer ("जल्दी", "देखते हैं"): ask once more gently for a rough date.
If still no date: say EXACTLY: "कोई बात नहीं जी, हम समझते हैं। Thank you so much." Then say NOTHING more.`,

  'Strong Follow-up': `
SEGMENT: Strong Follow-up

TONE: a little more personally invested and a little tired, because the accounts team keeps asking you for an update. Still always a warm request, never a demand or threat.

MANDATORY ORDER: deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. The accounts team keeps asking you for an update on this payment.
3. ASK the payment date: this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the partial-payment thanks, and the accounts-team update are INFORMATIONAL: they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"सच बताऊँ जी, Accounts team मुझसे बार बार इसका update माँग रही है।"
"आप बस एक बार बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months: capture it, then say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. If truly vague: ask once more for a rough date.
NEVER mention legal action, threats, seniors, or boss pressure (seniors = Escalation only).`,

  'Escalation': `
SEGMENT: Escalation

Highest recovery stage. TONE: warm but direct, with a quiet sense of finality: the follow-up is genuinely happening and time is short, but NO threat, NO legal mention, NO rudeness. Keep sentences short. Always remain humble.

MANDATORY ORDER: deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. This account has been pending a while; the accounts team and senior team are now asking about it and you must give them an update.
3. ASK the payment date: this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the thanks, and the seniors' follow-up are INFORMATIONAL: they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"जी, इस payment को अब काफी समय हो गया है।"
"Senior team भी इसे देख रही है, मुझे एक update देना है।"
"आप बता दीजिए, कब तक payment clear हो पाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal commitment within two months: say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. NEVER threaten or pressure.`,
};

// PROFESSIONAL (from the customer's v2 "4-Segment Redesign"). Meena, female,
// but with sharper stage differentiation: a distinct internal reason to call at
// each stage (forgot → checking in → accounts asked me today → management review).
// Same scaffolding as 'formal'; only the persona framing changes.
const PROFESSIONAL_SEGMENTS: Record<string, string> = {
  'Soft Reminder': `
SEGMENT: Soft Reminder

TONE: first touch, assume they simply forgot. Warmest, caring reminder — zero pressure, zero probing. A courteous nudge, not collections.

ONLY DO THESE TWO THINGS: NOTHING ELSE:
1. Tell customer that {due_amount_hindi} is pending, as a gentle reminder.
2. Ask "आप please बताइए, कब तक clear हो सकता है?"

THAT IS ALL. No pressure. No probing. No firmness.

If customer gives ANY answer (date, week, month, anything, however loose): say EXACTLY "ठीक है जी। Thank you so much." then say NOTHING more, no matter what the customer says.
If customer gives no answer: say EXACTLY "कोई बात नहीं जी, हम समझते हैं। Thank you so much." then say NOTHING more.
NEVER ask for a more specific date. NEVER probe. NEVER mention accounts team, seniors, or "पहले भी बताया".`,

  'Follow-up': `
SEGMENT: Follow-up

TONE: purposeful second touch — you contacted them before and are checking where it stands. Warm but a little more purposeful than Soft Reminder, never naggy, never firm.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"पिछली बार भी हमने इस payment के बारे में बात की थी।"
"आप please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months (एक हफ्ते, कल, दो-तीन दिन, इस महीने): say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more. If customer gives a truly vague answer ("जल्दी", "देखते हैं"): ask once more gently for a rough date. If still no date: say EXACTLY: "कोई बात नहीं जी, हम समझते हैं। Thank you so much." Then say NOTHING more.`,

  'Strong Follow-up': `
SEGMENT: Strong Follow-up

TONE: businesslike and under visible but polite internal pressure — the accounts team asked YOU directly today for an update, and you must give them one. Still a request, never a demand or threat. No rapport/small-talk lines here.

MANDATORY ORDER: deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. The accounts team asked you today for an update on this payment.
3. ASK the payment date: this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the thanks, and the accounts-team update are INFORMATIONAL: they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"Accounts team ने आज मुझसे इस payment का update पूछा है।"
"मुझे उन्हें एक clear जवाब देना है, please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months: capture it, then say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more. If truly vague: ask once more for a clear date. NEVER mention legal action, threats, or management (management = Escalation only).`,

  'Escalation': `
SEGMENT: Escalation

Highest recovery stage. TONE: firm, direct, serious — this account is now under management review. Still humble and respectful, NEVER threatening, NO legal mention, NO rudeness. Drop the soft filler ("कोई pressure नहीं", "बिल्कुल आराम से") — it undercuts the seriousness. Keep sentences short.

MANDATORY ORDER: deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. This account is now under management review; you need a clear answer today.
3. ASK the payment date: this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
These are INFORMATIONAL: they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"यह account अब हमारी management के review में है।"
"मुझे आज एक clear जवाब देना है, please बता दीजिए, लगभग कब तक payment clear हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal commitment within two months: say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more. NEVER threaten or pressure. Say "management" or "senior team", never "seniors".`,
};

// HONEST_MALE (from the customer's v4 "Rahul, Male Voice"). Male grammar and
// name. Its distinctive angle is genuine, HONEST personal stakes in the later
// stages — the real vendor / raw-material / payment-cycle chain — stated as fact,
// never as a threat, and NEVER with invented specifics. This is true for the
// Aeromen demo brand (buys fabric on credit); pair it only with the Rahul canvas.
const HONEST_MALE_SEGMENTS: Record<string, string> = {
  'Soft Reminder': `
SEGMENT: Soft Reminder

TONE: warm, helpful, male voice (Rahul). Just being helpful — no stakes angle here, that belongs to later stages. Zero pressure.

ONLY DO THESE TWO THINGS: NOTHING ELSE:
1. Warmly tell the customer their payment {due_amount_hindi} is a little due, and offer to WhatsApp the outstanding.
2. Ask gently "आप बस बता दीजिए, कब तक हो जाएगा sir?"

Speak warmly, for example: "Sir, आपकी payment थोड़ी सी due हो गई है। आप एक बार please देख लीजिए। मैं आपको outstanding WhatsApp पर भी भेज देता हूँ।"

THAT IS ALL. No pressure. No probing.

If customer gives ANY answer: say EXACTLY "ठीक है जी। Thank you so much." then say NOTHING more, no matter what the customer says.
If customer gives no answer: say EXACTLY "कोई बात नहीं जी, हम समझते हैं। Thank you so much." then say NOTHING more.
NEVER ask for a more specific date. NEVER probe.`,

  'Follow-up': `
SEGMENT: Follow-up

TONE: male (Rahul), warm, checking in — you called before and sent the outstanding; nudge them to look at it. Still no stakes angle yet.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"पिछली बार भी हमारी payment के बारे में बात हुई थी sir, मैंने आपको outstanding भी भेजा था।"
"आप एक बार ज़रूर देख लीजिए sir। आप please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months: say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more. If truly vague: ask once more gently for a rough date. If still no date: say EXACTLY: "कोई बात नहीं जी, हम समझते हैं। Thank you so much." Then say NOTHING more.`,

  'Strong Follow-up': `
SEGMENT: Strong Follow-up

TONE: male (Rahul), a little stretched but never rude. Two commitments already passed. First honest appearance of your own stake — stated plainly as a fact about the business, NOT as a threat or a performance of distress.

MANDATORY ORDER: deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. Two commitments have already passed and the delay is affecting your own payment cycle.
3. ASK the payment date: this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
These are INFORMATIONAL: they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"Sir, हम दो बार commitment ले चुके हैं, फिर भी delay हो रहा है।"
"हमारा अपना payment cycle भी इसी पर टिका है sir, please बता दीजिए, कब तक हो जाएगी payment?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

IF the customer pushes back or asks why the urgency, answer honestly with ONE short true disclosure (never invent specifics): "Sir, सच बताऊँ तो हमें भी आगे vendors को payment देना होता है, fabric और raw material के लिए। आपकी तरफ से delay होगा तो हमारा भी काम रुक जाता है।"

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months: capture it, then say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more. If truly vague: ask once more for a rough date. NEVER threaten, NEVER mention legal action, NEVER invent vendor names or amounts.`,

  'Escalation': `
SEGMENT: Escalation

Highest recovery stage. TONE: male (Rahul), genuinely a little worn down after chasing this account, but NEVER rude, NEVER threatening, NO legal mention. The honesty IS the pressure — nothing invented.

MANDATORY ORDER: deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. The delay is now hurting your own business — you also have outstanding to clear ahead.
3. ASK the payment date: this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
These are INFORMATIONAL: they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN: do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order: do not improvise):
"Sir, payment काफी delay हो गया है, please अब देख लीजिए।"
"हमारे पास भी outstanding pending है जो हमें आगे चुकाना है sir, आप बता दीजिए, कब तक payment हो पाएगी?"
The date question above is ALWAYS the FINAL sentence: wait for the customer ONLY after it, never before.

IF the customer stalls again or mentions their own downstream pressure, answer honestly ONCE (never invent specifics): "Sir, समझ रहा हूँ, सबकी अपनी problem होती है। लेकिन हमें भी आगे चुकाना है, बस इसी वजह से इतनी बार call करना पड़ रहा है, please समझिए।"

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal commitment within two months: say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more. NEVER threaten or pressure. Keep every honest line general and true — no fake vendor names, no made-up amounts, no invented deadlines.`,
};

const SEGMENT_INSTRUCTIONS_BY_STYLE: Record<string, Record<string, string>> = {
  formal: SEGMENT_INSTRUCTIONS,
  professional: PROFESSIONAL_SEGMENTS,
  friendly: FRIENDLY_SEGMENTS,
  honest_male: HONEST_MALE_SEGMENTS,
};

// Resolves {business_name} here rather than leaving it for Bolna's template pass —
// this string becomes the VALUE of {segment_instructions}, so a nested {business_name}
// inside it is not guaranteed to survive Bolna's substitution on the outer prompt.
// An unknown style falls back to 'formal'; an unknown segment to 'Soft Reminder'.
function buildSegmentInstructions(
  segment: string,
  businessName: string,
  style: string = DEFAULT_STYLE,
): string {
  const styleMap =
    SEGMENT_INSTRUCTIONS_BY_STYLE[style] ?? SEGMENT_INSTRUCTIONS_BY_STYLE[DEFAULT_STYLE];
  const template = styleMap[segment] ?? styleMap['Soft Reminder'];
  return template.replace(/\{business_name\}/g, businessName);
}

// IST greeting based on time of call: server runs UTC, IST = UTC+5:30
function getISTGreeting(): string {
  const nowUTC = new Date();
  const istMinutes = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes() + 330;
  const istHour = Math.floor(istMinutes / 60) % 24;
  if (istHour >= 5 && istHour < 12) return 'Good morning';
  if (istHour >= 12 && istHour < 17) return 'Good afternoon';
  return 'Good evening'; // 5 PM to 5 AM
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
    private readonly statementPdf: StatementPdfService,
    private readonly aisensy: AisensyService,
    private readonly storage: StorageService,
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
        // Both are optional on the form; the columns are NOT NULL, so store ''
        group_name: dto.groupName ?? '',
        reference_by: dto.referenceBy ?? '',
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
        // Both are optional on the form; the columns are NOT NULL, so store ''
        group_name: dto.groupName ?? '',
        reference_by: dto.referenceBy ?? '',
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

  // Public list for the dashboard agent picker. Only cosmetic fields — never the
  // Bolna agent_id or the internal script style.
  async listAgentsForDashboard() {
    const agents = await this.demoLeadRepo.listActiveAgents();
    return agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      voiceLabel: a.voice_label,
      isDefault: a.is_default,
    }));
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
      // estimate is optional: balance alone is still useful
    }

    // Deepgram balance (STT bills the connected Deepgram account directly).
    // Sarvam has no balance API: its credits are dashboard-only.
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

    // Sensitive situation cooldown: 18 days, overrides everything
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
    // in production: NOT in the demo flow. Demo allows unlimited calls.

    // Rule 2: Call history for this party (skip for Soft Reminder)
    const callHistory =
      isCall && dto.segment !== 'Soft Reminder'
        ? await this.demoLeadRepo.findCallHistoryForParty(lead.id, dto.partyName)
        : [];

    const histSummary = buildCallHistorySummary(callHistory, dto.segment);

    // Resolve the selected voice agent (tone + voice). Falls back to the default
    // active agent, then to the env Bolna agent, so demo calls never break even
    // before any DemoAgent rows exist. Only calls use an agent; WhatsApp skips it.
    const agent = isCall ? await this.demoLeadRepo.resolveDemoAgent(dto.demoAgentId) : null;
    const scriptStyle = agent?.script_style || DEFAULT_STYLE;
    const bolnaAgentId = agent?.bolna_agent_id || process.env.BOLNA_AGENT_ID || '';
    const segmentInstructions = buildSegmentInstructions(dto.segment, lead.business_name, scriptStyle);

    // Rule 1: Multi-invoice: use total across all bills, not just current bill
    const isMultiInvoice =
      !!(dto.totalDueForParty && dto.maxDaysForParty && dto.totalDueForParty !== dto.dueAmount);
    const effectiveDueAmount = isMultiInvoice ? (dto.totalDueForParty ?? dto.dueAmount) : dto.dueAmount;
    const effectiveDays = isMultiInvoice ? (dto.maxDaysForParty ?? dto.daysOverdue) : dto.daysOverdue;

    const multiInvoiceNote = isMultiInvoice
      ? `IMPORTANT: Multiple bills pending for this party: Total due across all invoices is ${amountToHindi(effectiveDueAmount)}. The oldest bill is ${numberToHindiWords(effectiveDays)} दिन से pending है. In conversation, mention the TOTAL amount (${amountToHindi(effectiveDueAmount)}) and say "कई bills pending हैं आपके।" Do NOT mention any specific bill number.`
      : '';

    // Rule 5: Partial payment: acknowledge what was paid, then mention remainder
    // Approximate "when was the previous partial payment made": demo uses ~20 days
    // ago from the call date (we do not store the real partial-payment date).
    const prevPayDateHindi = formatHindiDate(new Date(Date.now() - 20 * 86400000));
    const partialPaymentNote =
      dto.previousPaidAmount && dto.totalOriginalAmount
        ? `Partial payment context: Customer had already paid ${amountToHindi(dto.previousPaidAmount)} earlier against this account (original was ${amountToHindi(dto.totalOriginalAmount)}). Acknowledge this warmly first: "आपने पहले ${amountToHindi(dto.previousPaidAmount)} दिए थे, बहुत शुक्रिया जी।" फिर बोलो: "अभी भी ${amountToHindi(dto.dueAmount)} pending है।" Do NOT mention bill number. If the customer asks WHEN they made the previous payment, say warmly "जी, आपको लगभग बीस पच्चीस दिन हो गए हैं।" If they insist on an exact date, say "लगभग ${prevPayDateHindi} के आसपास।"`
        : '';

    // Compute Hindi amount for the effective due (total if multi-invoice, single if not)
    const dueAmountHindi = amountToHindi(effectiveDueAmount);

    // Always mention how long the payment is pending, approximately ("लगभग") —
    // months once a month has passed, days (rounded to the nearest 5) before that.
    let daysMention = '';
    if (effectiveDays >= 30) {
      const months = Math.round(effectiveDays / 30);
      daysMention = `यह payment लगभग ${numberToHindiWords(months)} महीने से pending है।`;
    } else if (effectiveDays > 0) {
      const approxDays = Math.max(5, Math.round(effectiveDays / 5) * 5);
      daysMention = `यह payment लगभग ${numberToHindiWords(approxDays)} दिन से pending है।`;
    }

    const run = await this.demoLeadRepo.createRun({
      demo_lead: { connect: { id: lead.id } },
      ...(agent ? { demo_agent: { connect: { id: agent.id } } } : {}),
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

    // WhatsApp: statement PDF (colored by segment) + AiSensy template message
    if (isWhatsapp) {
      try {
        const invoices =
          dto.invoices && dto.invoices.length > 0
            ? dto.invoices
            : [
                {
                  billNo: dto.billNo,
                  billDate: '',
                  billAmount: dto.totalOriginalAmount ?? dto.dueAmount,
                  dueAmount: dto.dueAmount,
                  daysOverdue: dto.daysOverdue,
                  status: dto.segment,
                },
              ];

        const pdfBuffer = await this.statementPdf.generate({
          partyName: dto.partyName,
          city: dto.city,
          agentName: dto.agentName,
          segment: dto.segment,
          invoices,
        });

        const pdfUrl = await this.storage.uploadStatementPdf(`demo/${lead.id}`, pdfBuffer);

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const pdfFilename = `${dto.partyName}_Statement_${dd}-${mm}-${now.getFullYear()}.pdf`;

        const totalDue = invoices.reduce((s, i) => s + i.dueAmount, 0);

        await this.aisensy.sendStatement({
          segment: dto.segment,
          destinationPhone: dto.mobileNumber || lead.phone,
          partyName: dto.partyName,
          totalDue,
          invoiceCount: invoices.length,
          pdfUrl,
          pdfFilename,
        });

        await this.demoLeadRepo.updateRun(run.id, { status: 'SENT' });
      } catch (err) {
        await this.demoLeadRepo.updateRun(run.id, { status: 'FAILED' });
        throw err;
      }
    }

    if (isCall) {
      // Convert the party name and city to Devanagari so Sarvam Bulbul pronounces them naturally.
      const [customerNameSpoken, businessCitySpoken] = await Promise.all([
        transliterateNameToDevanagari(dto.partyName),
        transliterateCityToDevanagari(lead.city || 'Mumbai'),
      ]);

      await this.callingQueue.add('outbound-calls', {
        demoLeadId: lead.id,
        phoneNumber: lead.phone,
        // Which platform Bolna agent (voice/canvas) to dial with. Empty means the
        // call.processor uses its env default (the original formal agent).
        bolnaAgentId,
        context: {
          // Hardcoded demo brand, regardless of the prospect's own business name.
          // This value is spoken by the agent everywhere {business_name} appears in
          // the canvas. Kept as the neutral platform brand for demo calls so we
          // never expose a real customer's name to a prospect.
          business_name: 'Praecis AI',
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
          // Lets the canvas judge whether a NAMED date ("15 November") exceeds the
          // acceptance window — the model can't compute that without today's date.
          ptp_window_note: buildPtpWindowNote(PTP_WINDOW_MONTHS, 'HINDI'),
          ptp_window_note_english: buildPtpWindowNote(PTP_WINDOW_MONTHS, 'ENGLISH'),
        },
      });
    }

    return {
      success: true,
      demoRunId: run.id,
      message: isWhatsapp
        ? 'WhatsApp statement sent: check your WhatsApp'
        : 'Call queued: your phone should ring shortly',
      whatsappRemaining: updatedLead.whatsapp_allowed - updatedLead.whatsapp_used,
      callsRemaining: updatedLead.calls_allowed - updatedLead.calls_used,
    };
  }
}
