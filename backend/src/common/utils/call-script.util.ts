import OpenAI from 'openai';

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
// words at zero cost; anything else uses a fast gpt-4o-mini transliteration,
// falling back to proper-case Roman.
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
    return out && /[ऀ-ॿ]/.test(out) ? out : proper;
  } catch {
    return proper;
  }
}

// ─── Segment-specific call scripts ───────────────────────────────────────────
// Each segment has STRICT boundaries. Agent must NOT use language from a higher segment.
const REFUSAL_GUARD = `FIRST, before closing, check this: if the customer REFUSES to pay ("मैं नहीं दूँगा", "नहीं दे पाऊँगा", "अभी नहीं होगा", "पैसे नहीं हैं"), OR gives a date MORE than two months away ("तीन महीने", "चार महीने बाद", "अगले साल") — do NOT thank, do NOT close yet. Ask gently, humbly, EXACTLY: "कोई खास परेशानी है, या आपकी बात seniors से करवा दूँ?" Never begin this line with an acknowledgement — no "जी बिल्कुल", no "मैं समझ सकती हूँ", no "ठीक है". The first word is "कोई". You may ask this line a MAXIMUM of THREE times in the whole call — if the customer refuses again after the third attempt, close warmly with "कोई बात नहीं जी, हम समझते हैं। Thank you so much." and say NOTHING more. Handle their reply after each attempt: death or medical or tragedy → give condolences and stop (do NOT say Thank you so much); financial or personal reason → "बिल्कुल समझती हूँ जी, कोई pressure नहीं है।" then say "Thank you so much." and stop; wants seniors → "बिल्कुल जी, मैं आपको अभी connect करती हूँ।" and connect; a sooner date (within two months) → "ठीक है जी। Thank you so much." and stop. If their turn also contains questions, answer every question first, then continue this step in the same response.`;

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

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise):
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

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise):
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

SPEAK ALL LINES CONTINUOUSLY IN ONE TURN — do NOT pause between them, do NOT hand the turn to the customer until the final date question is asked (Devanagari, short 4–7 word sentences, in order — do not improvise):
"मेरी तरफ से एक छोटी सी request है, Accounts team मुझसे update पूछ रही है।"
"Senior team भी जानकारी चाहते हैं।"
"अगर possible हो, please बता दीजिए, लगभग कब तक payment clear हो जाएगी?"
The date question above is ALWAYS the FINAL sentence — wait for the customer ONLY after it, never before.

${REFUSAL_GUARD}
Otherwise, if customer gives ANY normal commitment within two months — say EXACTLY: "ठीक है जी। Thank you so much." Then say NOTHING more, no matter what the customer says. NEVER threaten or pressure.`,
};

// Resolves {business_name} here rather than leaving it for Bolna's template pass.
export function buildSegmentInstructions(segment: string, businessName: string): string {
  const template = SEGMENT_INSTRUCTIONS[segment] ?? SEGMENT_INSTRUCTIONS['Soft Reminder'];
  return template.replace(/\{business_name\}/g, businessName);
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

// Strip legal suffixes for the spoken business name — "Aeromen Clothing LLP"
// should be spoken as "Aeromen Clothing".
export function spokenBusinessName(name: string): string {
  return name.replace(/\s+(llp|ltd\.?|pvt\.?\s*ltd\.?|private\s+limited|limited)\s*$/i, '').trim();
}
