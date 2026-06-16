import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { CampaignService, CreateCampaignDto, UpdateCampaignDto } from './campaign.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  @Get()
  findAll(@BusinessId() businessId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.campaignService.findAll(businessId, page, limit);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.campaignService.findById(businessId, id);
  }

  @Post()
  @Roles('MANAGER')
  create(@BusinessId() businessId: string, @Body() dto: CreateCampaignDto) {
    return this.campaignService.create(businessId, dto);
  }

  @Patch(':id')
  @Roles('MANAGER')
  update(@BusinessId() businessId: string, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignService.update(businessId, id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  remove(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.campaignService.remove(businessId, id);
  }
}
