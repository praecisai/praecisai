import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DemoLeadRepository } from './demo-lead.repository';
import { CreateDemoLeadDto } from './dto/create-demo-lead.dto';
import { RunDemoDto } from './dto/run-demo.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class DemoService {
  constructor(
    private readonly demoLeadRepo: DemoLeadRepository,
    private readonly jwtService: JwtService,
  ) {}

  async createLead(dto: CreateDemoLeadDto) {
    let lead = await this.demoLeadRepo.findByPhone(dto.phone);
    
    if (!lead) {
      lead = await this.demoLeadRepo.create({
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        business_name: dto.businessName,
        business_type: dto.businessType,
        parties_range: dto.partiesRange,
        outstanding_range: dto.outstandingRange,
      });
    }

    const payload = { sub: lead.id, type: 'demo_token' };
    const demoToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      id: lead.id,
      demoToken,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'demo_token') throw new Error();

      const lead = await this.demoLeadRepo.findById(payload.sub);
      if (!lead) {
        throw new UnauthorizedException('Demo lead not found');
      }

      return {
        id: lead.id,
        name: lead.name,
        businessName: lead.business_name,
        demosUsed: lead.demos_used,
        demosAllowed: lead.demos_allowed,
        status: lead.status,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired demo token');
    }
  }

  async runDemo(token: string, dto: RunDemoDto) {
    const payload = this.jwtService.verify(token);
    const lead = await this.demoLeadRepo.findById(payload.sub);

    if (!lead) {
      throw new UnauthorizedException('Demo lead not found');
    }

    if (lead.demos_used >= lead.demos_allowed || lead.status === 'EXHAUSTED') {
      throw new BadRequestException('Demo actions exhausted');
    }

    const run = await this.demoLeadRepo.createRun({
      demo_lead: { connect: { id: lead.id } },
      demo_type: dto.demoType,
      party_name: dto.partyName,
      bill_amount: dto.dueAmount,
      status: 'SENT',
    });

    const updatedLead = await this.demoLeadRepo.update(lead.id, {
      demos_used: lead.demos_used + 1,
      status: lead.demos_used + 1 >= lead.demos_allowed ? 'EXHAUSTED' : 'SIGNED_UP',
    });

    // TODO: integrate WhatsApp Cloud API here if dto.demoType === 'WHATSAPP'
    // TODO: integrate Retell AI here if dto.demoType === 'VOICE_CALL'

    return {
      success: true,
      demoRunId: run.id,
      demosRemaining: updatedLead.demos_allowed - updatedLead.demos_used,
    };
  }
}
