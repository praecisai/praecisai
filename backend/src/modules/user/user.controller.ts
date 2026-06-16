import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { UserService, CreateUserDto, UpdateUserDto } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles('MANAGER')
  findAll(
    @BusinessId() businessId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.userService.findAll(businessId, page, limit);
  }

  @Get(':id')
  @Roles('MANAGER')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.userService.findById(businessId, id);
  }

  @Post()
  @Roles('BUSINESS_OWNER')
  create(@BusinessId() businessId: string, @Body() dto: CreateUserDto) {
    return this.userService.create(businessId, dto);
  }

  @Patch(':id')
  @Roles('BUSINESS_OWNER')
  update(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(businessId, id, dto);
  }

  @Delete(':id')
  @Roles('BUSINESS_OWNER')
  remove(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.userService.remove(businessId, id);
  }
}
