import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface CallExtractionResult {
  call_summary: string;
  disposition: 'INTERESTED' | 'NOT_INTERESTED' | 'CALLBACK' | 'PTP' | 'DISPUTE' | 'NO_ANSWER' | 'UNKNOWN';
  key_objection: string | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  language_used: 'HINDI' | 'ENGLISH' | 'MIXED' | 'UNKNOWN';
  talk_ratio: number | null;
  is_sensitive: boolean;
  whatsapp_requested: boolean;
}

const SYSTEM_PROMPT = `You are a call analysis engine for an Indian debt recovery AI system.
Analyze the transcript and respond ONLY with a valid JSON object — no markdown, no backticks, no explanation.`;

const USER_PROMPT = `Extract the following from the call transcript:

{
  "call_summary": "<2-3 sentence factual summary>",
  "disposition": "<INTERESTED | NOT_INTERESTED | CALLBACK | PTP | DISPUTE | NO_ANSWER | UNKNOWN>",
  "key_objection": "<single sentence or null>",
  "follow_up_required": <true | false>,
  "follow_up_notes": "<string or null>",
  "language_used": "<HINDI | ENGLISH | MIXED | UNKNOWN>",
  "talk_ratio": <0-100 integer — % of call the agent spoke, or null>,
  "is_sensitive": <true if the customer mentioned a death, funeral, hospitalization, serious illness, accident, medical emergency, or family tragedy — including indirect Hindi phrasing such as "गुज़र गए", "नहीं रहे", "देहांत", "स्वर्गवास", "expire ho gaye", "off ho gaya", "chal base", "upar chala gaya", "admit hai", "ICU", "tabiyat bahut kharab", "accident ho gaya", "ghar mein maatam" — else false>,
  "whatsapp_requested": <true if the customer asked for the outstanding / statement / bill details to be sent on WhatsApp, and the agent agreed to send it — including phrasing such as "outstanding WhatsApp कर दो", "statement भेज दो", "mujhe bhej dijiye", "WhatsApp pe bhejo", "details भेज दीजिए", "bhej do main check karke bataata hu" — else false>
}

Disposition guide:
- INTERESTED: willing to pay
- NOT_INTERESTED: refused or disconnected
- CALLBACK: asked to call back later
- PTP: gave specific promise to pay (date/amount)
- DISPUTE: disputes the bill
- NO_ANSWER: call not answered or no meaningful conversation

Transcript:
`;

function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

@Injectable()
export class CallExtractionService {
  private readonly logger = new Logger(CallExtractionService.name);
  private readonly client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('CallExtractionService initialized with OpenAI client');
    } else {
      this.client = null;
      this.logger.warn('OPENAI_API_KEY not set — call extraction disabled');
    }
  }

  async extract(transcript: string): Promise<CallExtractionResult | null> {
    if (!this.client) {
      this.logger.warn('Extraction skipped — no OpenAI client');
      return null;
    }

    const trimmed = transcript?.trim() ?? '';
    this.logger.log(`Extraction requested — transcript length: ${trimmed.length} chars`);

    if (trimmed.length < 30) {
      this.logger.warn(`Transcript too short (${trimmed.length} chars) — skipping`);
      return null;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT + trimmed },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '';
      this.logger.log(`Raw extraction response: ${raw.substring(0, 300)}`);

      const parsed = JSON.parse(stripMarkdown(raw)) as CallExtractionResult;

      if (parsed.talk_ratio !== null && parsed.talk_ratio !== undefined) {
        parsed.talk_ratio = Math.min(100, Math.max(0, parsed.talk_ratio));
      }

      this.logger.log(`Extraction success: disposition=${parsed.disposition} sensitive=${parsed.is_sensitive}`);
      return parsed;
    } catch (err: any) {
      this.logger.error(`Extraction failed: ${err?.message || String(err)}`);
      return null;
    }
  }
}
