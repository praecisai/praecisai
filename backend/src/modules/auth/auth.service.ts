import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    // The JwtAuthGuard auto-provisions a tenant on first authenticated request,
    // so by the time signup calls /auth/onboard a user usually already exists.
    // Instead of conflicting, apply the business name the user actually typed
    // to that auto-provisioned business (the guard only knows a derived name).
    const existing = await this.prisma.user.findUnique({
      where: { supabase_uid: dto.supabaseUid },
    });
    if (existing) {
      const business = await this.prisma.business.update({
        where: { id: existing.business_id },
        data: { name: dto.businessName },
      });
      return { user: existing, business };
    }

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
