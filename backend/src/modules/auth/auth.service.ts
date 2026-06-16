import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private getSupabaseAdmin() {
    return createClient(
      this.config.get<string>('SUPABASE_URL')!,
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async validateToken(token: string) {
    const supabase = this.getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Invalid token');
    return data.user;
  }

  async getMe(supabaseUid: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabase_uid: supabaseUid },
      include: { business: true },
    });
    if (!user) throw new UnauthorizedException('User not onboarded');
    return user;
  }

  async onboard(dto: {
    supabaseUid: string;
    email: string;
    businessName: string;
  }) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { supabase_uid: dto.supabaseUid },
    });
    if (existing) throw new ConflictException('User already onboarded');

    // Create business + owner in transaction
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: dto.businessName },
      });

      const user = await tx.user.create({
        data: {
          business_id: business.id,
          supabase_uid: dto.supabaseUid,
          email: dto.email,
          role: 'BUSINESS_OWNER',
        },
      });

      return { user, business };
    });
  }
}
