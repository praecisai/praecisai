import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Closed-testing gate: only emails present in the allowed_emails table may
 * trigger costly/outbound actions (Excel import, AI calls, WhatsApp sends).
 * Everyone else can still log in and browse their own (empty) dashboard.
 *
 * Grant access by inserting a row in Supabase → Table Editor → allowed_emails.
 * Use AFTER JwtAuthGuard (needs request.user).
 */
@Injectable()
export class EmailAllowlistGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const email: string | undefined = request.user?.email?.toLowerCase();

    if (!email) {
      throw new ForbiddenException('This feature is not enabled for your account yet.');
    }

    const allowed = await this.prisma.allowedEmail.findUnique({
      where: { email },
    });

    if (!allowed) {
      throw new ForbiddenException(
        'This feature is not enabled for your account yet. Please contact PraecisAI for access.',
      );
    }

    return true;
  }
}
