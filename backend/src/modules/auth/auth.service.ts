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

  async getMe(supabaseUser: any) {
    let user = await this.prisma.user.findUnique({
      where: { supabase_uid: supabaseUser.id },
      include: { business: true },
    });

    if (!user) {
      // Auto-onboard for OAuth users
      const name = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User';
      const businessName = `${name}'s Business`;
      
      const res = await this.onboard({
        supabaseUid: supabaseUser.id,
        email: supabaseUser.email,
        businessName,
      });
      user = { ...res.user, business: res.business } as any;
    }

    return {
      ...user,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
      avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null
    };
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
