import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DemoLeadRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.DemoLeadCreateInput) {
    return this.prisma.demoLead.create({ data });
  }

  async findByPhone(phone: string) {
    return this.prisma.demoLead.findUnique({ where: { phone } });
  }

  async findById(id: string) {
    return this.prisma.demoLead.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.DemoLeadUpdateInput) {
    return this.prisma.demoLead.update({ where: { id }, data });
  }

  async createRun(data: Prisma.DemoRunCreateInput) {
    return this.prisma.demoRun.create({ data });
  }

  async updateRun(id: string, data: Prisma.DemoRunUpdateInput) {
    return this.prisma.demoRun.update({ where: { id }, data });
  }

  async findRunsByLeadId(leadId: string) {
    return this.prisma.demoRun.findMany({
      where: { demo_lead_id: leadId },
      select: { party_name: true, demo_type: true, status: true },
      orderBy: { created_at: 'asc' },
    });
  }

  // For call history summary — fetch completed voice call runs for a party with their extraction data
  async findCallHistoryForParty(leadId: string, partyName: string) {
    return this.prisma.demoRun.findMany({
      where: {
        demo_lead_id: leadId,
        party_name: partyName,
        demo_type: 'VOICE_CALL',
        status: 'SENT',
      },
      select: {
        created_at: true,
        call_summary: true,
        disposition: true,
        call_sentiment: true,
        promise_date: true,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  // Check if same phone number was called in the last N minutes
  async findRecentCallToPhone(phoneNumber: string, withinMinutes: number) {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    return this.prisma.demoRun.findFirst({
      where: {
        demo_lead: { phone: phoneNumber },
        demo_type: 'VOICE_CALL',
        created_at: { gte: since },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Check if a party has an active sensitive cooldown (death/medical emergency)
  async findActiveSensitiveCooldown(leadId: string, partyName: string) {
    return this.prisma.demoRun.findFirst({
      where: {
        demo_lead_id: leadId,
        party_name: partyName,
        is_sensitive: true,
        sensitive_cooldown_until: { gte: new Date() },
      },
      select: { sensitive_cooldown_until: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
