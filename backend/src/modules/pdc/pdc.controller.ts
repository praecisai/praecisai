import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdcService } from './pdc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PdcStatus } from '@prisma/client';

@Controller('pdc')
@UseGuards(JwtAuthGuard)
export class PdcController {
  constructor(private readonly pdcService: PdcService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.pdcService.uploadPdc(user.business_id, file);
  }

  @Get('cheques')
  async listCheques(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.pdcService.listCheques(user.business_id, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
  }

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.pdcService.getStats(user.business_id);
  }

  @Get('uploads')
  async getUploadHistory(@CurrentUser() user: any) {
    return this.pdcService.getUploadHistory(user.business_id);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { status: PdcStatus; notes?: string },
  ) {
    return this.pdcService.updateStatus(user.business_id, id, body.status, body.notes);
  }
}
