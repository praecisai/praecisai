import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthenticatedRequest extends Request {
  user: any;
  businessId: string;
  userRole: string;
  dbUser: any;
  token: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    // user is already set by JwtAuthGuard at route level
    // This middleware runs after the guard and enriches the request
    const supabaseUser = req.user;

    if (!supabaseUser) {
      return next();
    }

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { supabase_uid: supabaseUser.id },
        include: { business: true },
      });

      if (!dbUser) {
        throw new UnauthorizedException(
          'User not found in database. Please complete onboarding.',
        );
      }

      if (dbUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account is suspended or inactive');
      }

      req.businessId = dbUser.business_id;
      req.userRole = dbUser.role;
      req.dbUser = dbUser;

      next();
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      next(err);
    }
  }
}
