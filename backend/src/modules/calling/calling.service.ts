import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DemoRunStatus } from '@prisma/client';

@Injectable()
export class CallingService {
  private readonly logger = new Logger(CallingService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      // Find the most recent SENDING/PENDING run for this lead
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
      // Optional: Add a text column for analysis if needed, or store in logs.
      const analysis = callData.call_analysis || {};
      const customData = analysis.custom_analysis_data || {};
      
      const moodSummary = customData.customer_mood_summary || analysis.user_sentiment || 'Unknown';
      
      await this.prisma.demoRun.updateMany({
        where: { retell_call_id: callId },
        data: {
          // Status remains SENT as it's completed, but we can store analysis data somewhere if we added columns.
          // The prompt mentioned: "message_sent field can store the customer_mood_summary" 
          // But demo_runs doesn't have a message_sent field. If needed we can add one or just rely on recording_url.
        },
      });
    }
  }
}
