import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { DemoRunStatus, CallStatus } from '@prisma/client';
import { TenantKeysService } from '../../billing/tenant-keys.service';

// Pacing: one dial every 5s (~12/min, ~720/hr). Indian operators flag a CLI
// that emits a dense burst of short, unanswered calls, and a flagged CLI is
// slow to clear. An even trickle across the 12:00/16:00 windows looks like a
// collections desk rather than a dialer. Worker-wide, so manual bulk and the
// automated runs share the same pipe.
@Processor('outbound-calls', {
  concurrency: 1,
  limiter: { max: 1, duration: 5000 },
  stalledInterval: 60000,
  maxStalledCount: 1,
})
export class CallProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantKeys: TenantKeysService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { demoLeadId, callLogId, businessId, phoneNumber, context } = job.data;
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    console.log(
      `Processing call for ${callLogId ? `callLog: ${callLogId}` : `demoLead: ${demoLeadId}`} to ${formattedPhone} [${context.segment}]`,
    );

    // Production calls dial on the TENANT's own Bolna account (env fallback
    // until the key migration runs). Demo calls stay on the platform account.
    let apiKey = process.env.BOLNA_API_KEY;
    let agentId = process.env.BOLNA_AGENT_ID;
    if (callLogId && businessId) {
      const keys = await this.tenantKeys.getBolnaKeys(businessId);
      if (keys.apiKey) apiKey = keys.apiKey;
      if (keys.agentId) agentId = keys.agentId;
    }

    try {
      const response = await fetch('https://api.bolna.dev/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          recipient_phone_number: formattedPhone,
          user_data: {
            // Echoed back in the transfer pre-call webhook (%(call_log_id)s) so
            // the handoff briefing can reliably find this call. Harmless as a
            // prompt variable — the agent canvas never references it.
            call_log_id: callLogId || '',
            business_name: context.business_name,
            business_city: context.business_city || '',
            customer_name: context.customer_name,
            due_amount: context.due_amount,
            due_amount_hindi: context.due_amount_hindi,
            days_overdue: context.days_overdue,
            segment: context.segment,
            segment_instructions: context.segment_instructions,
            call_history_summary: context.call_history_summary || '',
            multi_invoice_note: context.multi_invoice_note || '',
            partial_payment_note: context.partial_payment_note || '',
            handoff_number: context.handoff_number,
            greeting_time: context.greeting_time || 'Namaskar',
            days_mention: context.days_mention || '',
            dispute_note: context.dispute_note || '',
            // English companions: the canvas uses these the moment the
            // customer switches to English, so amounts/scripts are never
            // translated on the fly.
            due_amount_english: context.due_amount_english || '',
            segment_instructions_english: context.segment_instructions_english || '',
            multi_invoice_note_english: context.multi_invoice_note_english || '',
            partial_payment_note_english: context.partial_payment_note_english || '',
            days_mention_english: context.days_mention_english || '',
            customer_name_english: context.customer_name_english || '',
            business_city_english: context.business_city_english || '',
            last_bill_note: context.last_bill_note || '',
            last_bill_note_english: context.last_bill_note_english || '',
            last_bill_number: context.last_bill_number || '',
          },
          metadata: callLogId ? { call_log_id: callLogId } : { demo_lead_id: demoLeadId },
        }),
      });

      if (!response.ok) {
        throw new Error(`Bolna API error: ${response.status} ${await response.text()}`);
      }

      const call = await response.json();
      console.log('Bolna API response:', JSON.stringify(call));

      // Bolna returns execution_id as the call identifier
      const callId = call.execution_id || call.run_id || call.call_id || call.id;

      if (callLogId) {
        // Production customer call: link Bolna execution to the CallLog
        await this.prisma.callLog.update({
          where: { id: callLogId },
          data: { retell_call_id: callId },
        });
      } else {
        const run = await this.prisma.demoRun.findFirst({
          where: { demo_lead_id: demoLeadId, status: DemoRunStatus.PENDING },
          orderBy: { created_at: 'desc' },
        });

        if (run) {
          await this.prisma.demoRun.update({
            where: { id: run.id },
            data: { retell_call_id: callId, status: DemoRunStatus.SENDING },
          });
        }
      }

      console.log(`Call dispatched: ${callId}`);
      return call;
    } catch (error) {
      console.error('Failed to dispatch call:', error);

      if (callLogId) {
        await this.prisma.callLog.update({
          where: { id: callLogId },
          data: { call_status: CallStatus.FAILED },
        });
      } else {
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
            data: { status: DemoRunStatus.FAILED },
          });
        }
      }

      throw error;
    }
  }
}
