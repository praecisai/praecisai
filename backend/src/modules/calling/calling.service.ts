import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DemoRunStatus, CallDisposition, CallSentiment, CallLanguage } from '@prisma/client';
import { CallExtractionService } from './call-extraction.service';

@Injectable()
export class CallingService {
  private readonly logger = new Logger(CallingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: CallExtractionService,
  ) {}

  async handleWebhook(payload: any) {
    this.logger.log(`Bolna webhook status: ${payload.status} id: ${payload.id}`);

    // Bolna sends status-based webhooks, not event-based like Retell
    // payload.id = execution_id = what we stored as retell_call_id
    const callId = payload.id;
    const status = payload.status;

    if (!callId) {
      this.logger.warn('Received webhook without call id');
      return;
    }

    // Map Bolna statuses to our flow
    if (status === 'initiated' || status === 'ringing') {
      // Mark as SENT when call is ringing
      await this.prisma.demoRun.updateMany({
        where: { retell_call_id: callId },
        data: { status: DemoRunStatus.SENT },
      });

    } else if (status === 'in-progress') {
      // Call connected — nothing extra to do

    } else if (status === 'call-disconnected') {
      // Call disconnected — save recording URL immediately
      const recordingUrl = payload.telephony_data?.recording_url;
      if (recordingUrl) {
        await this.prisma.demoRun.updateMany({
          where: { retell_call_id: callId },
          data: { call_recording_url: recordingUrl },
        });
      }

    } else if (status === 'completed') {
      // Call completed — save recording and run analysis
      const recordingUrl = payload.telephony_data?.recording_url;
      if (recordingUrl) {
        await this.prisma.demoRun.updateMany({
          where: { retell_call_id: callId },
          data: { call_recording_url: recordingUrl },
        });
      }
      await this.handleCallAnalyzed(callId, payload);

    } else if (status === 'failed' || status === 'error') {
      await this.prisma.demoRun.updateMany({
        where: { retell_call_id: callId },
        data: { status: DemoRunStatus.FAILED },
      });
    }
  }

  private async handleCallAnalyzed(callId: string, payload: any) {
    const transcript: string = payload.transcript || '';

    // Bolna extractions — deeply nested structure: extractions.field_name.field_name.subjective/objective
    const extractions = payload.custom_extractions || payload.extracted_data || payload.agent_extraction || {};
    this.logger.log(`Bolna extractions for ${callId}: ${JSON.stringify(extractions)}`);

    // Bolna nests each extraction as: extractions.promised_date.promised_date.subjective
    const promisedDateRaw = extractions?.promised_date?.promised_date?.subjective
      ?? extractions?.promised_date?.promised_date?.objective
      ?? extractions?.promised_date?.subjective
      ?? extractions?.promised_date;
    const promisedDate = this.parseDate(promisedDateRaw);

    const rawAmount = extractions?.promised_amount?.promised_amount?.objective
      ?? extractions?.promised_amount?.promised_amount?.subjective
      ?? extractions?.promised_amount?.subjective
      ?? extractions?.promised_amount;
    const promisedAmount = rawAmount ? parseFloat(String(rawAmount).replace(/[^0-9.]/g, '')) : null;

    const moodSummary = extractions?.customer_mood_summary?.customer_mood_summary?.subjective
      ?? extractions?.customer_mood_summary?.subjective
      ?? extractions?.customer_mood_summary
      ?? '';
    const callSentiment = this.mapSentiment(moodSummary, '');

    // Claude extraction from transcript
    const extraction = await this.extractionService.extract(transcript);

    if (!extraction) {
      this.logger.warn(`Extraction returned null for call ${callId} — storing Bolna data only`);
    }

    const isSensitive = extraction?.is_sensitive ?? false;
    const sensitiveCooldownUntil = isSensitive
      ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      : null;

    await this.prisma.demoRun.updateMany({
      where: { retell_call_id: callId },
      data: {
        ...(extraction && {
          call_summary: extraction.call_summary,
          disposition: extraction.disposition as CallDisposition,
          key_objection: extraction.key_objection,
          follow_up_required: extraction.follow_up_required,
          follow_up_notes: extraction.follow_up_notes,
          language_used: extraction.language_used as CallLanguage,
          talk_ratio: extraction.talk_ratio,
          is_sensitive: isSensitive,
          sensitive_cooldown_until: sensitiveCooldownUntil,
          extracted_at: new Date(),
        }),
        promise_date: promisedDate,
        promise_amount: isNaN(promisedAmount as number) ? null : promisedAmount,
        call_sentiment: callSentiment,
      },
    });

    if (isSensitive) {
      this.logger.warn(`Sensitive situation flagged for call ${callId} — cooldown applied`);
    }

    this.logger.log(
      `Call ${callId} analyzed: disposition=${extraction?.disposition ?? 'UNKNOWN'} sentiment=${callSentiment} ptp=${promisedDate?.toISOString() ?? 'none'} amount=${promisedAmount ?? 'none'}`,
    );
  }

  // Returns current time shifted to IST (UTC+5:30) so Supabase displays Indian time
  private parseDate(dateStr: any): Date | null {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    // Handle DD/MM/YYYY format from Bolna
    const ddmmyyyy = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  private toIST(date: Date): Date {
    return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  }

  private mapSentiment(moodSummary: any, retellSentiment: any): CallSentiment {
    const text = (String(moodSummary || retellSentiment || '')).toLowerCase();
    if (!text) return CallSentiment.UNKNOWN;
    if (text.includes('hostile') || text.includes('angry') || text.includes('rude')) return CallSentiment.HOSTILE;
    if (text.includes('negative') || text.includes('frustrated') || text.includes('reluctant')) return CallSentiment.NEGATIVE;
    if (text.includes('positive') || text.includes('cooperative') || text.includes('willing') || text.includes('agreeable')) return CallSentiment.POSITIVE;
    return CallSentiment.NEUTRAL;
  }
}
