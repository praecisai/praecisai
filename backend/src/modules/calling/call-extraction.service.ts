import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export interface CallExtractionResult {
  call_summary: string;
  disposition: 'INTERESTED' | 'NOT_INTERESTED' | 'CALLBACK' | 'PTP' | 'DISPUTE' | 'NO_ANSWER' | 'UNKNOWN';
  key_objection: string | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  language_used: 'HINDI' | 'ENGLISH' | 'MIXED' | 'UNKNOWN';
  talk_ratio: number | null;
  is_sensitive: boolean;  // customer disclosed death/medical emergency — triggers 18-day cooldown
}

// Retell already extracts: promised_amount, promised_date, customer_mood_summary, was_transferred.
// Claude fills the gaps: call_summary, disposition, key_objection, follow_up_*, language_used, talk_ratio, is_sensitive.
const EXTRACTION_PROMPT = `You are a call analysis engine for an Indian debt recovery AI system.

You will receive a transcript of a voice call between an AI recovery agent and a business debtor (party).
Retell has already extracted payment promises — focus on conversation quality, next steps, and sensitive situations.
Respond ONLY with valid JSON matching this exact schema — no commentary, no markdown.

{
  "call_summary": "<2-3 sentence factual summary of what happened>",
  "disposition": "<one of: INTERESTED | NOT_INTERESTED | CALLBACK | PTP | DISPUTE | NO_ANSWER | UNKNOWN>",
  "key_objection": "<single sentence summarising the main objection raised, else null>",
  "follow_up_required": <true | false>,
  "follow_up_notes": "<what to say or do on next contact, else null>",
  "language_used": "<one of: HINDI | ENGLISH | MIXED | UNKNOWN>",
  "talk_ratio": <0–100 integer representing approximate % of conversation where the agent spoke, else null>,
  "is_sensitive": <true if customer disclosed death in family, medical emergency, serious illness, hospitalisation, accident — else false>
}

Disposition guide:
- INTERESTED: customer acknowledged debt, showed willingness to pay
- NOT_INTERESTED: customer refused or disconnected
- CALLBACK: customer asked to be called back at a different time
- PTP: customer gave a specific promise to pay (date/amount)
- DISPUTE: customer disputes the bill or amount
- NO_ANSWER: call not picked up or no meaningful conversation

is_sensitive = true triggers an 18-day calling cooldown. Set it ONLY when the customer explicitly disclosed a personal emergency (death, hospital, serious illness). Cash flow issues or general "I'm busy" do NOT qualify.

Context: Indian B2B outstanding recovery call.`;

@Injectable()
export class CallExtractionService {
  private readonly logger = new Logger(CallExtractionService.name);
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    } else {
      this.client = null;
      this.logger.warn('ANTHROPIC_API_KEY not set — call extraction disabled');
    }
  }

  async extract(transcript: string, durationSeconds?: number): Promise<CallExtractionResult | null> {
    if (!this.client) return null;
    if (!transcript || transcript.trim().length < 50) return null;

    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `${EXTRACTION_PROMPT}\n\nTranscript:\n${transcript}`,
          },
        ],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const parsed = JSON.parse(text) as CallExtractionResult;

      // Clamp talk_ratio to 0-100
      if (parsed.talk_ratio !== null && parsed.talk_ratio !== undefined) {
        parsed.talk_ratio = Math.min(100, Math.max(0, parsed.talk_ratio));
      }

      return parsed;
    } catch (err) {
      this.logger.error('Call extraction failed', err);
      return null;
    }
  }
}
