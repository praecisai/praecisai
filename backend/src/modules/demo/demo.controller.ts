import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { DemoService } from './demo.service';
import { CreateDemoLeadDto } from './dto/create-demo-lead.dto';
import { RunDemoDto } from './dto/run-demo.dto';

@Controller('demo-leads')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post()
  async createLead(@Body() dto: CreateDemoLeadDto) {
    return this.demoService.createLead(dto);
  }

  @Get('validate-token/:token')
  async validateToken(@Param('token') token: string) {
    return this.demoService.validateToken(token);
  }

  @Post(':token/run-demo')
  async runDemo(@Param('token') token: string, @Body() dto: RunDemoDto) {
    return this.demoService.runDemo(token, dto);
  }

  @Get(':token/runs')
  async getRuns(@Param('token') token: string) {
    return this.demoService.getRunsForLead(token);
  }

  @Get(':token/credits')
  async getCredits(@Param('token') token: string) {
    return this.demoService.getCredits(token);
  }
}
