import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import Retell from 'retell-sdk';
import { PrismaService } from '../../../prisma/prisma.service';
import { DemoRunStatus } from '@prisma/client';

// This agent uses retell-llm (llm_4dde1f4ee3cf6b2a0276df2b061d) as its response engine.
// It has the webhook, Simran voice, and post-call analysis already configured.
const RECOVERY_AGENT_ID = 'agent_e71aad7ffbca2d2c38dd42399d';

@Processor('outbound-calls', {
  concurrency: 1,
  stalledInterval: 60000,
  maxStalledCount: 1,
})
export class CallProcessor extends WorkerHost {
  private retellClient: Retell;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.retellClient = new Retell({
      apiKey: process.env.RETELL_API_KEY || '',
    });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { demoLeadId, phoneNumber, context } = job.data;
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    console.log(`Processing call for demoLead: ${demoLeadId} to ${formattedPhone} [${context.segment}]`);

    try {
      const call = await this.retellClient.call.createPhoneCall({
        from_number: process.env.RETELL_FROM_NUMBER || '',
        to_number: formattedPhone,
        override_agent_id: RECOVERY_AGENT_ID,
        retell_llm_dynamic_variables: {
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
        },
        metadata: {
          demo_lead_id: demoLeadId,
        },
      });

      const run = await this.prisma.demoRun.findFirst({
        where: { demo_lead_id: demoLeadId, status: DemoRunStatus.PENDING },
        orderBy: { created_at: 'desc' },
      });

      if (run) {
        await this.prisma.demoRun.update({
          where: { id: run.id },
          data: { retell_call_id: call.call_id, status: DemoRunStatus.SENDING },
        });
      }

      console.log(`Call dispatched: ${call.call_id}`);
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
