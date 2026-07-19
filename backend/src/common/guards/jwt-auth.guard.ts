import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    let supabaseUser: any;
    try {
      const supabase = createClient(
        this.configService.get<string>('SUPABASE_URL')!,
        this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      supabaseUser = data.user;
    } catch {
      throw new UnauthorizedException('Token validation failed');
    }

    request.user = supabaseUser;
    request.token = token;

    // Tenant resolution — the single source of truth for request.businessId.
    // (Must happen here: Nest middleware runs BEFORE guards, so a middleware
    // can never see the user this guard authenticates.)
    let dbUser = await this.prisma.user.findUnique({
      where: { supabase_uid: supabaseUser.id },
    });

    // First authenticated request with no tenant yet → provision one now, so
    // the client can pay immediately and their business shows up in /admin as
    // a lead. Previously only /auth/me did this, which the locked paywall never
    // calls — so brand-new (or post-tenant-delete) accounts got stuck on
    // "No business linked" and could never reach checkout.
    if (!dbUser) {
      dbUser = await this.provisionTenant(supabaseUser);
    }

    if (dbUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is suspended or inactive');
    }
    request.businessId = dbUser.business_id;
    request.userRole = dbUser.role;
    request.dbUser = dbUser;

    return true;
  }

  /**
   * Idempotently create a Business + owner User for a freshly authenticated
   * Supabase account. Safe against concurrent requests: a lost race hits the
   * supabase_uid unique constraint (P2002), after which we just re-read the
   * row the winner created.
   */
  private async provisionTenant(supabaseUser: any) {
    const name =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split('@')[0] ||
      'New';
    const businessName = `${name}'s Business`;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const business = await tx.business.create({ data: { name: businessName } });
        return tx.user.create({
          data: {
            business_id: business.id,
            supabase_uid: supabaseUser.id,
            email: supabaseUser.email,
            role: 'BUSINESS_OWNER',
          },
        });
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const existing = await this.prisma.user.findUnique({
          where: { supabase_uid: supabaseUser.id },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }
}
