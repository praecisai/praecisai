import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, MinLength } from 'class-validator';

class OnboardDto {
  @IsString()
  @MinLength(2)
  businessName!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
    @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  @Post('onboard')
    @UseGuards(JwtAuthGuard)
  async onboard(@CurrentUser() user: any, @Body() dto: OnboardDto) {
    return this.authService.onboard({
      supabaseUid: user.id,
      email: user.email,
      businessName: dto.businessName,
    });
  }
}
