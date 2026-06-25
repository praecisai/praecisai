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
  is_sensitive: boolean;
}

const EXTRACTION_PROMPT = `You are a call analysis engine for an Indian debt recovery AI system.

Analyze the transcript and respond ONLY with a valid JSON object — no markdown, no backticks, no explanation.

{
  "call_summary": "<2-3 sentence factual summary>",
  "disposition": "<INTERESTED | NOT_INTERESTED | CALLBACK | PTP | DISPUTE | NO_ANSWER | UNKNOWN>",
  "key_objection": "<single sentence or null>",
  "follow_up_required": <true | false>,
  "follow_up_notes": "<string or null>",
  "language_used": "<HINDI | ENGLISH | MIXED | UNKNOWN>",
  "talk_ratio": <0-100 integer or null>,
  "is_sensitive": <true if death/medical emergency/hospital mentioned, else false>
}

Disposition:
- INTERESTED: willing to pay
- NOT_INTERESTED: refused or disconnected
- CALLBACK: asked to call back later
- PTP: gave specific promise to pay
- DISPUTE: disputes the bill
- NO_ANSWER: call not answered or no conversation`;

// Strip markdown code fences if model wraps JSON in them
function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

@Injectable()
export class CallExtractionService {
  private readonly logger = new Logger(CallExtractionService.name);
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log('CallExtractionService initialized with Anthropic client');
    } else {
      this.client = null;
      this.logger.warn('ANTHROPIC_API_KEY not set — call extraction disabled');
    }
  }

  async extract(transcript: string, durationSeconds?: number): Promise<CallExtractionResult | null> {
    if (!this.client) {
      this.logger.warn('Extraction skipped — no Anthropic client');
      return null;
    }

    const trimmed = transcript?.trim() ?? '';
    this.logger.log(`Extraction requested — transcript length: ${trimmed.length} chars`);

    if (trimmed.length < 30) {
      this.logger.warn(`Transcript too short (${trimmed.length} chars) — skipping extraction`);
      return null;
    }

    // Try Haiku first, fall back to Sonnet if model not available
    const models = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'];

    for (const model of models) {
      try {
        this.logger.log(`Trying extraction with model: ${model}`);

        const message = await this.client.messages.create({
          model,
          max_tokens: 600,
          messages: [
            {
              role: 'user',
              content: `${EXTRACTION_PROMPT}\n\nTranscript:\n${trimmed}`,
            },
          ],
        });

        const raw = message.content[0].type === 'text' ? message.content[0].text : '';
        this.logger.log(`Raw extraction response (first 200 chars): ${raw.substring(0, 200)}`);

        const cleaned = stripMarkdown(raw);
        const parsed = JSON.parse(cleaned) as CallExtractionResult;

        if (parsed.talk_ratio !== null && parsed.talk_ratio !== undefined) {
          parsed.talk_ratio = Math.min(100, Math.max(0, parsed.talk_ratio));
        }

        this.logger.log(`Extraction success with ${model}: disposition=${parsed.disposition} sensitive=${parsed.is_sensitive}`);
        return parsed;

      } catch (err: any) {
        const errMsg = err?.message || String(err);
        this.logger.error(`Extraction failed with model ${model}: ${errMsg}`);

        // If it's a model access error, try next model
        if (errMsg.includes('model') || errMsg.includes('404') || errMsg.includes('not found')) {
          this.logger.warn(`Model ${model} not available, trying next...`);
          continue;
        }

        // For JSON parse errors, log the raw response
        if (errMsg.includes('JSON') || errMsg.includes('parse')) {
          this.logger.error('JSON parse failed — Claude returned non-JSON response');
        }

        // For other errors (rate limit, auth), don't retry
        return null;
      }
    }

    this.logger.error('All extraction models failed');
    return null;
  }
}
