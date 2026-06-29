import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { DemoRunStatus } from '@prisma/client';

@Processor('outbound-calls', {
  concurrency: 1,
  stalledInterval: 60000,
  maxStalledCount: 1,
})
export class CallProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { demoLeadId, phoneNumber, context } = job.data;
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    console.log(`Processing call for demoLead: ${demoLeadId} to ${formattedPhone} [${context.segment}]`);

    try {
      const response = await fetch('https://api.bolna.dev/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BOLNA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: process.env.BOLNA_AGENT_ID,
          recipient_phone_number: formattedPhone,
          user_data: {
            business_name: context.business_name,
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
          },
          metadata: { demo_lead_id: demoLeadId },
        }),
      });

      if (!response.ok) {
        throw new Error(`Bolna API error: ${response.status} ${await response.text()}`);
      }

      const call = await response.json();
      console.log('Bolna API response:', JSON.stringify(call));

      // Bolna may return call_id or id depending on API version
      const callId = call.call_id || call.id || call.callId;

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

      console.log(`Call dispatched: ${callId}`);
      return call;
    } catch (error) {
      console.error('Failed to dispatch call:', error);

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

      throw error;
    }
  }
}
