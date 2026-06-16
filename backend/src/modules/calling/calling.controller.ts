import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { CallingService } from './calling.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('calling')
@UseGuards(JwtAuthGuard)
export class CallingController {
  constructor(private callingService: CallingService) {}

  @Get('logs')
  getLogs(@BusinessId() businessId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.callingService.getLogs(businessId, page, limit);
  }

  @Post('logs')
  createLog(@BusinessId() businessId: string, @Body() dto: any) {
    return this.callingService.createLog(businessId, dto);
  }
}
