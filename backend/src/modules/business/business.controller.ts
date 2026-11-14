import { Controller, Get, Patch, Body, Param, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { BusinessService, UpdateBusinessDto } from './business.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId, CurrentUser } from '../../common/decorators/current-user.decorator';
import { isPlatformOwner } from '../../common/constants/platform-owner';

@Controller('business')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get()
    @Roles('SUPER_ADMIN')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.businessService.findAll(page, limit);
  }

  /** Every business, for the platform owner's business switcher. */
  @Get('switchable')
  async switchable(@CurrentUser() user: any) {
    if (!isPlatformOwner(user?.email)) throw new ForbiddenException('Platform owners only');
    return this.businessService.listForSwitcher();
  }

  @Get('me')
    getMyBusiness(@BusinessId() businessId: string) {
    return this.businessService.findById(businessId);
  }

  @Patch('me')
    @Roles('BUSINESS_OWNER')
  updateMyBusiness(@BusinessId() businessId: string, @Body() dto: UpdateBusinessDto) {
    // Status and plan are set by the PraecisAI team (admin), never by the
    // tenant. The owner may rename their business.
    const { status: _status, plan: _plan, ...own } = dto;
    return this.businessService.update(businessId, own);
  }

  @Get(':id')
    @Roles('SUPER_ADMIN')
  findOne(@Param('id') id: string) {
    return this.businessService.findById(id);
  }

  @Patch(':id')
    @Roles('SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(id, dto);
  }
}
