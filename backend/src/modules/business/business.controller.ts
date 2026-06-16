import { Controller, Get, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { BusinessService, UpdateBusinessDto } from './business.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('business')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get()
    @Roles('SUPER_ADMIN')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.businessService.findAll(page, limit);
  }

  @Get('me')
    getMyBusiness(@BusinessId() businessId: string) {
    return this.businessService.findById(businessId);
  }

  @Patch('me')
    @Roles('BUSINESS_OWNER')
  updateMyBusiness(@BusinessId() businessId: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(businessId, dto);
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
