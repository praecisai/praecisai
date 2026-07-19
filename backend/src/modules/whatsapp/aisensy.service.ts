import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

// AiSensy API-campaign names per segment. The live campaigns were created with
// a _v1 suffix (original names were taken); override via env if they change.
const CAMPAIGN_BY_SEGMENT: Record<string, { env: string; fallback: string }> = {
  'Soft Reminder': { env: 'AISENSY_CAMPAIGN_SOFT_REMINDER', fallback: 'soft_reminder_pdf_v1' },
  'Follow-up': { env: 'AISENSY_CAMPAIGN_FOLLOW_UP', fallback: 'follow_up_pdf_v1' },
  'Strong Follow-up': { env: 'AISENSY_CAMPAIGN_STRONG_FOLLOW_UP', fallback: 'strong_follow_up_pdf_v1' },
  Escalation: { env: 'AISENSY_CAMPAIGN_ESCALATION', fallback: 'escalation_pdf_v1' },
};

export interface SendStatementParams {
  segment: string;
  destinationPhone: string; // any format; normalized to 91XXXXXXXXXX
  partyName: string;
  totalDue: number;
  invoiceCount: number;
  pdfUrl: string;
  pdfFilename: string;
  // Per-tenant AiSensy key (tenants hold their own accounts). Falls back to
  // the platform AISENSY_API_KEY env for the demo flow / pre-migration tenants.
  apiKeyOverride?: string;
}

@Injectable()
export class AisensyService {
  private readonly logger = new Logger(AisensyService.name);

  constructor(private config: ConfigService) {}

  campaignForSegment(segment: string): string {
    const entry = CAMPAIGN_BY_SEGMENT[segment] ?? CAMPAIGN_BY_SEGMENT['Soft Reminder'];
    return this.config.get<string>(entry.env) || entry.fallback;
  }

  /**
   * Send the statement-PDF template message via an AiSensy API campaign.
   * Template variables: {{1}} party name, {{2}} amount, {{3}} invoice count.
   */
  async sendStatement(params: SendStatementParams): Promise<void> {
    const apiKey = params.apiKeyOverride || this.config.get<string>('AISENSY_API_KEY');
    if (!apiKey) throw new BadRequestException('No AiSensy API key configured for this business');

    const digits = params.destinationPhone.replace(/\D/g, '');
    const destination =
      digits.length === 10 ? `91${digits}` : digits;

    const campaignName = this.campaignForSegment(params.segment);

    const body = {
      apiKey,
      campaignName,
      destination,
      userName: params.partyName,
      templateParams: [
        params.partyName,
        params.totalDue.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
        String(params.invoiceCount),
      ],
      media: {
        url: params.pdfUrl,
        filename: params.pdfFilename,
      },
    };

    const res = await fetch(AISENSY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      this.logger.error(
        `AiSensy send failed (${res.status}) campaign=${campaignName} dest=${destination}: ${text}`,
      );
      throw new BadRequestException(`WhatsApp send failed: ${text || res.statusText}`);
    }

    this.logger.log(
      `AiSensy sent campaign=${campaignName} dest=${destination} party=${params.partyName}`,
    );
  }
}
