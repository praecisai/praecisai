import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import Retell from 'retell-sdk';
import { PrismaService } from '../../../prisma/prisma.service';
import { DemoRunStatus } from '@prisma/client';

@Processor('outbound-calls')
export class CallProcessor extends WorkerHost {
  private retellClient: Retell;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.retellClient = new Retell({
      apiKey: process.env.RETELL_API_KEY || 'test-api-key',
    });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { demoLeadId, phoneNumber, context } = job.data;
    
    // Retell requires E.164 format. Ensure it starts with + (default to India +91)
    let formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    console.log(`Processing call for demoLead: ${demoLeadId} to ${formattedPhone}`);

    try {
      const call = await this.retellClient.call.createPhoneCall({
        from_number: process.env.RETELL_FROM_NUMBER || '',
        to_number: formattedPhone,
        override_agent_id: process.env.RETELL_AGENT_ID || '',
        retell_llm_dynamic_variables: {
          business_name: context.business_name,
          customer_name: context.customer_name,
          bill_no: context.bill_no,
          due_amount: context.due_amount,
          days_overdue: context.days_overdue,
          segment: context.segment,
          previous_paid_amount: context.previous_paid_amount,
          handoff_number: process.env.RETELL_HANDOFF_NUMBER || '',
        },
        metadata: {
          demo_lead_id: demoLeadId,
        },
      });

      // Find the pending demo run and update its status to SENDING
      const run = await this.prisma.demoRun.findFirst({
        where: { demo_lead_id: demoLeadId, status: DemoRunStatus.PENDING },
        orderBy: { created_at: 'desc' },
      });

      if (run) {
        await this.prisma.demoRun.update({
          where: { id: run.id },
          data: {
            retell_call_id: call.call_id,
            status: DemoRunStatus.SENDING,
          },
        });
      }

      console.log('Successfully dispatched Retell call:', call);
      return call;
    } catch (error) {
      console.error('Failed to dispatch Retell call:', error);
      
      // Update the run to FAILED
      const run = await this.prisma.demoRun.findFirst({
        where: { demo_lead_id: demoLeadId, status: { in: [DemoRunStatus.PENDING, DemoRunStatus.SENDING] } },
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
