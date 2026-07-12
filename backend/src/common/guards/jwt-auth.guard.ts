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
    const dbUser = await this.prisma.user.findUnique({
      where: { supabase_uid: supabaseUser.id },
    });

    if (dbUser) {
      if (dbUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account is suspended or inactive');
      }
      request.businessId = dbUser.business_id;
      request.userRole = dbUser.role;
      request.dbUser = dbUser;
    }
    // No dbUser yet → first login; only /auth/me (which auto-onboards) works,
    // because the BusinessId decorator rejects requests without a business.

    return true;
  }
}
