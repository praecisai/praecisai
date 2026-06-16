import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AiAnalysisService } from './ai-analysis.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('ai-analysis')
@UseGuards(JwtAuthGuard)
export class AiAnalysisController {
  constructor(private aiAnalysisService: AiAnalysisService) {}

  @Get('customer/:customerId')
  findByCustomer(@BusinessId() businessId: string, @Param('customerId') customerId: string) {
    return this.aiAnalysisService.findByCustomer(businessId, customerId);
  }

  @Post()
  create(@BusinessId() businessId: string, @Body() dto: any) {
    return this.aiAnalysisService.create(businessId, dto);
  }
}
