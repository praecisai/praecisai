import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('logs')
  getLogs(@BusinessId() businessId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.whatsappService.getLogs(businessId, page, limit);
  }

  @Post('logs')
  createLog(@BusinessId() businessId: string, @Body() dto: any) {
    return this.whatsappService.createLog(businessId, dto);
  }
}
