import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdcService } from './pdc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/current-user.decorator';
import { PdcStatus } from '@prisma/client';

// Tenant scope comes from @BusinessId (request.businessId, set by JwtAuthGuard).
// It must NOT come from @CurrentUser: that is the raw Supabase user, which has
// no business_id — passing undefined made writes throw and made reads drop the
// tenant filter entirely (Prisma ignores `where: { business_id: undefined }`).
@Controller('pdc')
@UseGuards(JwtAuthGuard)
export class PdcController {
  constructor(private readonly pdcService: PdcService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @BusinessId() businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.pdcService.uploadPdc(businessId, file);
  }

  // Manually add one cheque; appended alongside uploaded data.
  @Post('cheques')
  async createCheque(
    @BusinessId() businessId: string,
    @Body() body: { party_name: string; cheque_no: string; cheque_date?: string; amount: number },
  ) {
    return this.pdcService.createCheque(businessId, body);
  }

  @Get('cheques')
  async listCheques(
    @BusinessId() businessId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.pdcService.listCheques(businessId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
  }

  @Get('stats')
  async getStats(@BusinessId() businessId: string) {
    return this.pdcService.getStats(businessId);
  }

  @Get('uploads')
  async getUploadHistory(@BusinessId() businessId: string) {
    return this.pdcService.getUploadHistory(businessId);
  }

  @Patch(':id/status')
  async updateStatus(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() body: { status: PdcStatus; notes?: string },
  ) {
    return this.pdcService.updateStatus(businessId, id, body.status, body.notes);
  }
}
