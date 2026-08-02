import OpenAI from 'openai';

// The language a business's AI recovery agent speaks. Mirrors the Prisma
// BusinessCallLanguage enum; kept as a local union so this util has no Prisma
// import. Every spoken variable is built in this language.
export type CallLang = 'HINDI' | 'ENGLISH';

// ─── Shared call-script helpers for PRODUCTION customer calls ─────────────────
// Copied from the proven demo flow (demo.service.ts) so the demo stays frozen
// while real-customer calling evolves independently. Any tuning learned in
// production should be back-ported deliberately, not implicitly.

// ─── Hindi number words for multiples of 5 (in thousands) — 5 to 95 ──────────
const THOUSAND_WORDS: Record<number, string> = {
  5: 'पाँच', 10: 'दस', 15: 'पंद्रह', 20: 'बीस', 25: 'पच्चीस',
  30: 'तीस', 35: 'पैंतीस', 40: 'चालीस', 45: 'पैंतालीस', 50: 'पचास',
  55: 'पचपन', 60: 'साठ', 65: 'पैंसठ', 70: 'सत्तर', 75: 'पचहत्तर',
  80: 'अस्सी', 85: 'पचासी', 90: 'नब्बे', 95: 'पंचानवे', 100: 'सौ',
};

// Converts exact rupee amounts to clean spoken Hindi — always rounded UP to
// the nearest ₹5,000 for amounts under 1 lakh. DB and UI keep the exact amount;
// only the spoken value on calls is rounded — customers get frustrated by exact figures.
export function amountToHindi(amount: number): string {
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

// ─── English number words (0-99) — for spoken Indian-English amounts/counts ───
const ENGLISH_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const ENGLISH_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy',
  'eighty', 'ninety'];

export function englishNumberWords(num: number): string {
  const n = Math.round(num);
  if (n < 0) return '';
  if (n < 20) return ENGLISH_ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? ENGLISH_TENS[t] : `${ENGLISH_TENS[t]} ${ENGLISH_ONES[o]}`;
  }
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  const head = `${ENGLISH_ONES[hundreds]} hundred`;
  return rem === 0 ? head : `${head} ${englishNumberWords(rem)}`;
}

// Spoken Indian-English amount, rounded the same way as amountToHindi: under a
// lakh rounds up to the nearest 5,000; at/above a lakh rounds to the nearest
// half-lakh ("two and a half lakh"). The exact figure lives in the DB/UI.
export function amountToEnglish(amount: number): string {
  if (amount <= 0) return 'some amount';

  if (amount < 100000) {
    const roundedThousands = Math.min(100, Math.ceil(amount / 5000) * 5);
    if (roundedThousands === 100) return 'approximately one lakh rupees';
    return `approximately ${englishNumberWords(roundedThousands)} thousand rupees`;
  }

  const halfLakhs = Math.round(amount / 50000) / 2; // nearest 0.5 lakh
  const whole = Math.floor(halfLakhs);
  const hasHalf = halfLakhs - whole === 0.5;
  const wholeWord = englishNumberWords(whole || 1);
  if (hasHalf) return `approximately ${wholeWord} and a half lakh rupees`;
  return `approximately ${wholeWord} lakh rupees`;
}

// Language-appropriate spoken amount for the {due_amount_hindi} call variable.
export function amountToSpoken(amount: number, language: CallLang): string {
  return language === 'ENGLISH' ? amountToEnglish(amount) : amountToHindi(amount);
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
export function numberToHindiWords(num: number): string {
  const n = Math.round(num);
  if (n <= 0) return 'शून्य';
  if (n <= 99) return HINDI_CARDINALS[n];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const hundredsWord = `${HINDI_CARDINALS[hundreds]} सौ`;
  return remainder === 0 ? hundredsWord : `${hundredsWord} ${HINDI_CARDINALS[remainder]}`;
}

// All-caps names sound robotic when TTS reads them. Proper case sounds natural.
export function toProperCase(name: string): string {
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
export function formatHindiDate(d: Date): string {
  const ist = new Date(d.getTime() + 330 * 60000);
  return `${HINDI_MONTHS[ist.getUTCMonth()]} की ${DAY_ORDINALS[ist.getUTCDate()]} तारीख`;
}

// ─── Name → Devanagari transliteration for natural TTS ───────────────────────
// Sarvam Bulbul v2 is an Indic (Hindi) TTS. Roman-script names inside a Hindi
// context get mangled. A small local map covers the most common surnames/company
// words at zero cost; anything else uses a gpt-4o transliteration (runs before
// dial, so accuracy matters more than latency), falling back to proper-case Roman.
let _openaiClient: OpenAI | null | undefined;
function getOpenAI(): OpenAI | null {
  if (_openaiClient !== undefined) return _openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  _openaiClient = apiKey ? new OpenAI({ apiKey }) : null;
  return _openaiClient;
}

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

export async function transliterateCityToDevanagari(city: string): Promise<string> {
  if (!city) return '';
  const key = city.trim().toLowerCase();
  if (CITY_MAP[key]) return CITY_MAP[key];
  return transliterateNameToDevanagari(city);
}

export async function transliterateNameToDevanagari(name: string): Promise<string> {
  const proper = toProperCase(name);
  const tokens = proper.split(/\s+/).filter(Boolean);

  if (tokens.every(t => NAME_TOKEN_MAP[t.toLowerCase()])) {
    return tokens.map(t => NAME_TOKEN_MAP[t.toLowerCase()]).join(' ');
  }

  const client = getOpenAI();
  if (!client) return proper;

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
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
    return out && /[ऀ-ॿ]/.test(out) ? out : proper;
  } catch {
    return proper;
  }
}

// ─── Segment-specific call scripts ───────────────────────────────────────────
// Each segment has STRICT boundaries. Agent must NOT use language from a higher segment.
const REFUSAL_GUARD = `ACCEPT-FIRST (highest priority): if the customer gives ANY clear date or timeframe within two months — "कल", "इस हफ्ते", "अगले हफ्ते"/"next week", "दस-पंद्रह दिन में", "इस महीने", or a specific तारीख — that is ACCEPTED. Say EXACTLY "ठीक है जी। Thank you so much." and stop. NEVER ask the "कोई खास परेशानी है" line for an accepted date. The difficulty/seniors probe is ONLY for an outright refusal or a date beyond two months — never for a normal date like "next week".
ONLY if the customer REFUSES to pay ("मैं नहीं दूँगा", "नहीं दे पाऊँगा", "अभी नहीं होगा", "पैसे नहीं हैं"), OR gives a date MORE than two months away ("तीन महीने", "चार महीने बाद", "अगले साल") — do NOT thank, do NOT close yet. Ask gently, humbly, EXACTLY: "कोई खास परेशानी है, या आपकी बात seniors से करवा दूँ?" Never begin this line with an acknowledgement — no "जी बिल्कुल", no "मैं समझ सकती हूँ", no "ठीक है". The first word is "कोई". You may ask this line a MAXIMUM of TWO times in the whole call — if the customer refuses again after the second attempt, close warmly with "कोई बात नहीं जी, हम समझते हैं। Thank you so much." and say NOTHING more. Handle their reply after each attempt: death or medical or tragedy → give condolences and stop (do NOT say Thank you so much); financial or personal reason → "बिल्कुल समझती हूँ जी, कोई pressure नहीं है।" then say "Thank you so much." and stop; wants seniors → "बिल्कुल जी, मैं आपको अभी connect करती हूँ।" and connect; a sooner date (within two months) → "ठीक है जी। Thank you so much." and stop. If their turn also contains questions, answer every question first, then continue this step in the same response.`;

const SEGMENT_INSTRUCTIONS: Record<string, string> = {
  'Soft Reminder': `
SEGMENT: Soft Reminder

ONLY DO THESE TWO THINGS — NOTHING ELSE:
1. Tell customer that {due_amount_hindi} is pending.
2. Ask "आप please बताइए, कब तक clear हो सकता है?"

THAT IS ALL. No pressure. No probing. No firmness.

If customer gives ANY answer (date, week, month, anything) — say EXACTLY "ठीक है जी। Thank you so much." then say NOTHING more, no matter what the customer says.
If customer gives no answer — say EXACTLY "कोई बात नहीं जी, हम समझते हैं। Thank you so much." then say NOTHING more.
NEVER ask for a more specific date. NEVER probe further. NEVER add extra sentences.`,

  'Follow-up': `
SEGMENT: Follow-up

TONE: friendly, gentle reminder — you had contact before, this is just a soft follow-up. Never firm, never pressuring.

DO THESE THINGS:
1. Tell customer {due_amount_hindi} is pending.
2. Ask warmly for a rough/expected date. Approximate is completely fine.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise). The FIRST line is ALWAYS the amount; never skip it:
"Sir, आपके account में {due_amount_hindi} की एक pending payment है।"
"यह एक छोटा सा follow-up call है, अगर approximate date भी हो तो चलेगा।"
"आप please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months (एक हफ्ते, कल, दो-तीन दिन, इस महीने) — say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. Do not probe further.
If customer gives truly vague answer ("जल्दी", "देखते हैं") — ask once more gently for a rough date.
If still no date — say EXACTLY: "कोई बात नहीं जी, हम समझते हैं। Thank you so much." Then say NOTHING more.`,

  'Strong Follow-up': `
SEGMENT: Strong Follow-up

TONE: firm but respectful — accounts team is asking you for an update. Always a request, never a demand or threat.

MANDATORY ORDER — deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. Accounts team is asking you for an update on this payment.
3. ASK the payment date — this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the partial-payment thanks, and the accounts-team update are INFORMATIONAL — they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise). The FIRST line is ALWAYS the amount; never skip it:
"Sir, आपके account में {due_amount_hindi} की एक pending payment है।"
"मेरी तरफ से एक request थी, Accounts team मुझसे इस payment का update पूछ रही है।"
"अगर possible हो, please बता दीजिए, लगभग कब तक payment हो जाएगी?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal timeframe within two months — capture it, then say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. If truly vague — ask once more for a rough date.
NEVER mention legal action, threats, seniors, or boss pressure (seniors = Escalation only).`,

  'Escalation': `
SEGMENT: Escalation

Highest recovery stage. TONE: warm, humble, genuinely requesting — internal follow-up is really happening, but NO threat, NO legal mention, NO rudeness. Always remain humble.

MANDATORY ORDER — deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. Accounts team and the senior team are asking about this account; you must give them an update.
3. ASK the payment date — this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the thanks, and the seniors' follow-up are INFORMATIONAL — they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise). The FIRST line is ALWAYS the amount; never skip it:
"Sir, आपके account में {due_amount_hindi} की एक pending payment है।"
"मेरी तरफ से एक छोटी सी request है, Accounts team मुझसे update पूछ रही है।"
"Senior team भी जानकारी चाहते हैं।"
"अगर possible हो, please बता दीजिए, लगभग कब तक payment clear हो जाएगी?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal commitment within two months — say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. NEVER threaten or pressure.`,
};

// ─── English segment scripts — mirror the Hindi ones, Indian English ─────────
const REFUSAL_GUARD_EN = `ACCEPT-FIRST (highest priority): if the customer gives ANY clear date or timeframe within two months — "tomorrow", "this week", "next week", "in ten to fifteen days", "this month", or a specific date — that is ACCEPTED. Say EXACTLY "Alright sir. Thank you so much." and stop. NEVER ask the "Is there some particular difficulty" line for an accepted date. The difficulty/seniors probe is ONLY for an outright refusal or a date beyond two months — never for a normal date like "next week".
ONLY if the customer REFUSES to pay ("I won't pay", "I can't pay now", "not possible right now", "no money"), OR gives a date MORE than two months away ("after three months", "next year") — do NOT thank, do NOT close yet. Ask gently, humbly, EXACTLY: "Is there some particular difficulty, or shall I connect you with our seniors?" Never begin this line with an acknowledgement — no "sure", no "I understand", no "alright". The first word is "Is". You may ask this line a MAXIMUM of TWO times in the whole call — if the customer refuses again after the second attempt, close warmly with "No problem sir, we understand. Thank you so much." and say NOTHING more. Handle their reply after each attempt: death or medical or tragedy → give condolences and stop (do NOT say Thank you so much); financial or personal reason → "I completely understand sir, there is no pressure at all." then say "Thank you so much." and stop; wants seniors → "Of course, I will connect you right away." and connect; a sooner date (within two months) → "Alright sir. Thank you so much." and stop. If their turn also contains questions, answer every question first, then continue this step in the same response.`;

const SEGMENT_INSTRUCTIONS_EN: Record<string, string> = {
  'Soft Reminder': `
SEGMENT: Soft Reminder

ONLY DO THESE TWO THINGS — NOTHING ELSE:
1. Tell the customer that {due_amount_hindi} is pending.
2. Ask "Could you please tell me by when it can be cleared?"

THAT IS ALL. No pressure. No probing. No firmness.

If customer gives ANY answer (date, week, month, anything) — say EXACTLY "Alright sir. Thank you so much." then say NOTHING more, no matter what the customer says.
If customer gives no answer — say EXACTLY "No problem sir, we understand. Thank you so much." then say NOTHING more.
NEVER ask for a more specific date. NEVER probe further. NEVER add extra sentences.`,

  'Follow-up': `
SEGMENT: Follow-up

TONE: friendly, gentle reminder — you had contact before, this is just a soft follow-up. Never firm, never pressuring.

DO THESE THINGS:
1. Tell the customer {due_amount_hindi} is pending.
2. Ask warmly for a rough/expected date. Approximate is completely fine.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (short 4-7 word sentences, in order — do not improvise). The FIRST line is ALWAYS the amount; never skip it:
"Sir, there is a pending payment of {due_amount_english} on your account."
"This is just a small follow-up call, even an approximate date is fine."
"Could you please tell me, by when will the payment be done, approximately?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

${REFUSAL_GUARD_EN}
Otherwise, if customer gives ANY normal timeframe within two months (a week, tomorrow, two-three days, this month) — say EXACTLY: "Alright sir. Thank you so much." Then say NOTHING more, no matter what the customer says. Do not probe further.
If customer gives a truly vague answer ("soon", "let's see") — ask once more gently for a rough date.
If still no date — say EXACTLY: "No problem sir, we understand. Thank you so much." Then say NOTHING more.`,

  'Strong Follow-up': `
SEGMENT: Strong Follow-up

TONE: firm but respectful — the accounts team is asking you for an update. Always a request, never a demand or threat.

MANDATORY ORDER — deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. The accounts team is asking you for an update on this payment.
3. ASK the payment date — this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the partial-payment thanks, and the accounts-team update are INFORMATIONAL — they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (short 4-7 word sentences, in order — do not improvise). The FIRST line is ALWAYS the amount; never skip it:
"Sir, there is a pending payment of {due_amount_english} on your account."
"I had a small request, our accounts team is asking me for an update on this payment."
"If possible, please tell me, by when will the payment be done, approximately?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

${REFUSAL_GUARD_EN}
Otherwise, if customer gives ANY normal timeframe within two months — capture it, then say EXACTLY: "Alright sir. Thank you so much." Then say NOTHING more, no matter what the customer says. If truly vague — ask once more for a rough date.
NEVER mention legal action, threats, seniors, or boss pressure (seniors = Escalation only).`,

  'Escalation': `
SEGMENT: Escalation

Highest recovery stage. TONE: warm, humble, genuinely requesting — internal follow-up is really happening, but NO threat, NO legal mention, NO rudeness. Always remain humble.

MANDATORY ORDER — deliver every step, NEVER stop early:
1. (If partial payment) thank them for the previous payment.
2. The accounts team and the senior team are asking about this account; you must give them an update.
3. ASK the payment date — this step is MANDATORY and can NEVER be skipped.
4. Wait for the customer's answer.
The amount, the thanks, and the senior team's follow-up are INFORMATIONAL — they never end the conversation. You MUST reach the date question in step 3.

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (short 4-7 word sentences, in order — do not improvise). The FIRST line is ALWAYS the amount; never skip it:
"Sir, there is a pending payment of {due_amount_english} on your account."
"I have a small request, our accounts team is asking me for an update."
"The senior team also needs the information."
"If possible, please tell me, by when will the payment be cleared, approximately?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

${REFUSAL_GUARD_EN}
Otherwise, if customer gives ANY normal commitment within two months — say EXACTLY: "Alright sir. Thank you so much." Then say NOTHING more, no matter what the customer says. NEVER threaten or pressure.`,
};

// Resolves {business_name} here rather than leaving it for Bolna's template
// pass. `language` selects the Hindi (Hinglish) or English script set.
export function buildSegmentInstructions(
  segment: string,
  businessName: string,
  language: CallLang = 'HINDI',
): string {
  const set = language === 'ENGLISH' ? SEGMENT_INSTRUCTIONS_EN : SEGMENT_INSTRUCTIONS;
  const template = set[segment] ?? set['Soft Reminder'];
  return template.replace(/\{business_name\}/g, businessName);
}

// ─── Language-aware spoken notes (multi-invoice, partial payment, overdue) ────
// Kept here so both languages of each phrase live side by side.

export function buildDaysMention(maxDays: number, language: CallLang): string {
  if (maxDays <= 0) return '';
  if (language === 'ENGLISH') {
    if (maxDays >= 30) {
      const months = Math.round(maxDays / 30);
      return `This payment has been pending for about ${englishNumberWords(months)} month${months === 1 ? '' : 's'}.`;
    }
    const approxDays = Math.max(5, Math.round(maxDays / 5) * 5);
    return `This payment has been pending for about ${englishNumberWords(approxDays)} days.`;
  }
  if (maxDays >= 30) {
    const months = Math.round(maxDays / 30);
    return `यह payment लगभग ${numberToHindiWords(months)} महीने से pending है।`;
  }
  const approxDays = Math.max(5, Math.round(maxDays / 5) * 5);
  return `यह payment लगभग ${numberToHindiWords(approxDays)} दिन से pending है।`;
}

export function buildMultiInvoiceNote(
  invoiceCount: number,
  totalDue: number,
  maxDays: number,
  language: CallLang,
): string {
  if (invoiceCount <= 1) return '';
  const amt = amountToSpoken(totalDue, language);
  if (language === 'ENGLISH') {
    return `IMPORTANT: Multiple bills are pending for this party. Total due across all invoices is ${amt}. The oldest bill has been pending for about ${maxDays} days. In conversation, mention the TOTAL amount (${amt}) and say "You have several bills pending." Do NOT mention any specific bill number.`;
  }
  return `IMPORTANT: Multiple bills pending for this party: Total due across all invoices is ${amt}. The oldest bill is ${numberToHindiWords(maxDays)} दिन से pending है. In conversation, mention the TOTAL amount (${amt}) and say "कई bills pending हैं आपके।" Do NOT mention any specific bill number.`;
}

export function buildPartialPaymentNote(
  previousPaid: number,
  totalDue: number,
  totalBilled: number,
  language: CallLang,
): string {
  if (previousPaid <= 0) return '';
  const paid = amountToSpoken(previousPaid, language);
  const billed = amountToSpoken(totalBilled, language);
  const due = amountToSpoken(totalDue, language);
  if (language === 'ENGLISH') {
    return `Partial payment context: Customer had already paid ${paid} earlier against this account (original was ${billed}). Acknowledge this warmly first: "You had paid ${paid} earlier, thank you so much." Then say: "Still ${due} is pending." Do NOT mention bill number.`;
  }
  return `Partial payment context: Customer had already paid ${paid} earlier against this account (original was ${billed}). Acknowledge this warmly first: "आपने पहले ${paid} दिए थे, बहुत शुक्रिया जी।" फिर बोलो: "अभी भी ${due} pending है।" Do NOT mention bill number.`;
}

// IST greeting based on time of call — server runs UTC, IST = UTC+5:30
export function getISTGreeting(): string {
  const nowUTC = new Date();
  const istMinutes = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes() + 330;
  const istHour = Math.floor(istMinutes / 60) % 24;
  if (istHour >= 5 && istHour < 12) return 'Good morning';
  if (istHour >= 12 && istHour < 17) return 'Good afternoon';
  return 'Good evening'; // 5 PM to 5 AM
}

export function buildCallHistorySummary(
  history: Array<{ call_summary: string | null; disposition: string | null; promise_date: Date | null }>,
  segment: string,
): string {
  if (segment === 'Soft Reminder' || history.length === 0) return '';

  // Readable spoken-friendly date ("19 July 2026"), never "19/7/2026": bare
  // slashed dates get read out as digits and clash with the date-pronunciation
  // rules in the agent canvas.
  const readableDate = (d: Date) => {
    const ist = new Date(d.getTime() + 330 * 60000);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'];
    return `${ist.getUTCDate()} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
  };

  const lines = history.map((h, i) => {
    const num = i + 1;
    const disp = h.disposition ? `(${h.disposition})` : '';
    const summary = h.call_summary ?? 'Previous call happened, detailed summary unavailable';
    const ptp = h.promise_date
      ? ` Last time the customer promised to pay by ${readableDate(h.promise_date)}.`
      : '';
    return `Attempt ${num} ${disp}: ${summary}${ptp}`;
  });

  return `Previous contact history (reference it briefly and naturally: remind them you spoke before and, if a date was promised, gently ask about that commitment): ${lines.join(' | ')}`;
}

// Normalize an Indian phone number to E.164 (+91XXXXXXXXXX) for Bolna's blind
// transfer and AiSensy. A bare 10-digit number won't bridge; an already-prefixed
// number is passed through. Empty stays empty (callers guard on that).
export function toE164India(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

// Strip legal suffixes for the spoken business name — "Aeromen Clothing LLP"
// should be spoken as "Aeromen Clothing". Tally exports are usually ALL CAPS,
// which the TTS reads robotically or spells out ("A-E-R-O-M-E-N"), so proper-case
// an all-caps result. Names that already have lowercase (intentional brands like
// "TechCorp") are left untouched.
export function spokenBusinessName(name: string): string {
  const stripped = name
    .replace(/\s+(llp|ltd\.?|pvt\.?\s*ltd\.?|private\s+limited|limited)\s*$/i, '')
    .trim();
  return /[a-z]/.test(stripped) ? stripped : toProperCase(stripped);
}
