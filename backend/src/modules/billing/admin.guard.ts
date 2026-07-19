import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Praecis-staff gate on top of JwtAuthGuard. Admin emails come from the
 * ADMIN_EMAILS env var (comma-separated, case-insensitive).
 *
 * Non-admins get a 404: the admin area should not even reveal that it exists.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const email: string | undefined = request.user?.email?.toLowerCase();
    const admins = (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!email || !admins.includes(email)) {
      throw new NotFoundException();
    }
    return true;
  }
}
