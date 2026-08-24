import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { toE164India } from '../../common/utils/call-script.util';

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
        // Email signup puts the mobile in user_metadata; phone-auth accounts
        // carry it on the auth user itself. Google sign-ups have neither, and
        // stay null until the owner fills it in.
        phone: supabaseUser.user_metadata?.phone || supabaseUser.phone || undefined,
      });
      user = { ...res.user, business: res.business } as any;
    }

    return {
      ...user,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
      avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null
    };
  }

  /**
   * Set the owner's mobile after the fact. Google sign-ups never pass through
   * the signup form, so this is the only place their number can come from.
   */
  async updateProfile(supabaseUid: string, dto: { phone: string }) {
    const user = await this.prisma.user.findUnique({
      where: { supabase_uid: supabaseUid },
    });
    if (!user) throw new NotFoundException('No account found for this login');

    return this.prisma.user.update({
      where: { id: user.id },
      data: { phone: toE164India(dto.phone) },
    });
  }

  async onboard(dto: {
    supabaseUid: string;
    email: string;
    businessName: string;
    phone?: string;
  }) {
    // Stored E.164 so the number is dialable/WhatsApp-able as-is, whatever the
    // owner typed. Absent phone leaves the column untouched rather than nulling
    // a number the account already has.
    const phone = dto.phone ? toE164India(dto.phone) : undefined;

    // The JwtAuthGuard auto-provisions a tenant on first authenticated request,
    // so by the time signup calls /auth/onboard a user usually already exists.
    // Instead of conflicting, apply the business name the user actually typed
    // to that auto-provisioned business (the guard only knows a derived name).
    const existing = await this.prisma.user.findUnique({
      where: { supabase_uid: dto.supabaseUid },
    });
    if (existing) {
      const [business, user] = await this.prisma.$transaction([
        this.prisma.business.update({
          where: { id: existing.business_id },
          data: { name: dto.businessName },
        }),
        this.prisma.user.update({
          where: { id: existing.id },
          data: phone ? { phone } : {},
        }),
      ]);
      return { user, business };
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
          phone: phone ?? null,
          role: 'BUSINESS_OWNER',
        },
      });

      return { user, business };
    });
  }
}
