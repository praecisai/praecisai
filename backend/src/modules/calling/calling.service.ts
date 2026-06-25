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
    const eventType = payload.event;
    const callData = payload.call;

    if (!callData || !callData.metadata || !callData.metadata.demo_lead_id) {
      this.logger.warn('Received webhook without demo_lead_id metadata');
      return;
    }

    const demoLeadId = callData.metadata.demo_lead_id;
    const callId = callData.call_id;

    if (eventType === 'call_started') {
      const run = await this.prisma.demoRun.findFirst({
        where: {
          demo_lead_id: demoLeadId,
          status: { in: [DemoRunStatus.PENDING, DemoRunStatus.SENDING] },
        },
        orderBy: { created_at: 'desc' },
      });

      if (run) {
        await this.prisma.demoRun.update({
          where: { id: run.id },
          data: {
            status: DemoRunStatus.SENT,
            retell_call_id: callId,
          },
        });
      }
    } else if (eventType === 'call_ended') {
      const recordingUrl = callData.recording_url;
      if (recordingUrl) {
        await this.prisma.demoRun.updateMany({
          where: { retell_call_id: callId },
          data: { call_recording_url: recordingUrl },
        });
      }
    } else if (eventType === 'call_analyzed') {
      await this.handleCallAnalyzed(callId, callData);
    }
  }

  private async handleCallAnalyzed(callId: string, callData: any) {
    const transcript: string = callData.transcript || '';
    const durationSeconds: number | undefined = callData.duration_ms
      ? Math.round(callData.duration_ms / 1000)
      : undefined;

    // Retell's own GPT-5.1 post-call analysis (already extracted by Retell)
    const retellAnalysis = callData.call_analysis || {};
    const retellCustom = retellAnalysis.custom_analysis_data || {};

    const retellPromiseDate = retellCustom.promised_date
      ? new Date(retellCustom.promised_date)
      : null;
    const retellPromiseAmount = retellCustom.promised_amount
      ? parseFloat(retellCustom.promised_amount)
      : null;

    // Map Retell's user_sentiment to our CallSentiment enum
    const retellSentiment = retellAnalysis.user_sentiment as string | undefined;
    const callSentiment = this.mapSentiment(retellCustom.customer_mood_summary, retellSentiment);

    // Claude fills the gaps Retell doesn't cover
    const extraction = await this.extractionService.extract(transcript, durationSeconds);

    if (!extraction) {
      this.logger.warn(`Extraction returned null for call ${callId} — storing Retell data only`);
    }

    const isSensitive = extraction?.is_sensitive ?? false;
    const sensitiveCooldownUntil = isSensitive
      ? new Date(Date.now() + 18 * 24 * 60 * 60 * 1000)
      : null;

    await this.prisma.demoRun.updateMany({
      where: { retell_call_id: callId },
      data: {
        // From Claude
        call_summary: extraction?.call_summary ?? null,
        disposition: (extraction?.disposition ?? 'UNKNOWN') as CallDisposition,
        key_objection: extraction?.key_objection ?? null,
        follow_up_required: extraction?.follow_up_required ?? false,
        follow_up_notes: extraction?.follow_up_notes ?? null,
        language_used: (extraction?.language_used ?? 'UNKNOWN') as CallLanguage,
        talk_ratio: extraction?.talk_ratio ?? null,
        is_sensitive: isSensitive,
        sensitive_cooldown_until: sensitiveCooldownUntil,
        // From Retell's own analysis
        promise_date: retellPromiseDate,
        promise_amount: isNaN(retellPromiseAmount as number) ? null : retellPromiseAmount,
        call_sentiment: callSentiment,
        extracted_at: new Date(),
      },
    });

    if (isSensitive) {
      this.logger.warn(`Sensitive situation flagged for call ${callId} — 18-day cooldown applied`);
    }

    this.logger.log(
      `Call ${callId} analyzed: disposition=${extraction?.disposition ?? 'UNKNOWN'} sentiment=${callSentiment} ptp=${retellCustom.promised_date ?? 'none'}`,
    );
  }

  private mapSentiment(moodSummary: string | undefined, retellSentiment: string | undefined): CallSentiment {
    const text = (moodSummary || retellSentiment || '').toLowerCase();
    if (!text) return CallSentiment.UNKNOWN;
    if (text.includes('hostile') || text.includes('angry') || text.includes('rude')) return CallSentiment.HOSTILE;
    if (text.includes('negative') || text.includes('frustrated') || text.includes('reluctant')) return CallSentiment.NEGATIVE;
    if (text.includes('positive') || text.includes('cooperative') || text.includes('willing') || text.includes('agreeable')) return CallSentiment.POSITIVE;
    return CallSentiment.NEUTRAL;
  }
}
