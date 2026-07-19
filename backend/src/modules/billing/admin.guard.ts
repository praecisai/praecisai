import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

/**
 * Guards every /admin route with the standalone credential token issued by
 * POST /admin/login (see AdminAuthService). Independent of Supabase auth:
 * the panel belongs to Praecis staff only.
 *
 * Token is read from "Authorization: Bearer <token>" or "x-admin-token".
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private adminAuth: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers['authorization'];
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const token = bearer ?? (request.headers['x-admin-token'] as string | undefined);

    if (!this.adminAuth.verify(token)) {
      throw new UnauthorizedException('Admin session expired or invalid: log in again');
    }
    return true;
  }
}
