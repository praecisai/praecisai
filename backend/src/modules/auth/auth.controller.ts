import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, Matches, MinLength } from 'class-validator';

class OnboardDto {
  @IsString()
  @MinLength(2)
  businessName!: string;

  // Mandatory from the signup form: the owner's mobile is the only channel the
  // Praecis team has to reach a fresh tenant before any keys or payment exist.
  // Accepts 9876543210 / 09876543210 / +91 98765 43210; normalized to E.164
  // in the service, so the stored shape is always +91XXXXXXXXXX.
  @IsString()
  @Matches(/^(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}$/, {
    message: 'Enter a valid 10-digit Indian mobile number',
  })
  phone!: string;
}

/**
 * Fills in the mobile for accounts the signup form never touched — Google
 * sign-ups above all, which Google gives us no phone number for.
 */
class UpdateProfileDto {
  @IsString()
  @Matches(/^(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}$/, {
    message: 'Enter a valid 10-digit Indian mobile number',
  })
  phone!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user);
  }

  @Post('onboard')
    @UseGuards(JwtAuthGuard)
  async onboard(@CurrentUser() user: any, @Body() dto: OnboardDto) {
    return this.authService.onboard({
      supabaseUid: user.id,
      email: user.email,
      businessName: dto.businessName,
      phone: dto.phone,
    });
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, { phone: dto.phone });
  }
}
