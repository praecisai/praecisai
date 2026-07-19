import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_FAILURES = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Standalone credential login for the Praecis staff panel: independent of
 * Supabase, so /admin works with just ADMIN_USERNAME + ADMIN_PASSWORD from
 * backend/.env. Successful login issues a signed stateless token
 * (HMAC-SHA256 with JWT_SECRET) that expires after 12 hours.
 *
 * Brute-force guard: after 8 wrong attempts the login locks for 15 minutes
 * (in-memory: restarting the backend clears it).
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private failures = 0;
  private lockedUntil = 0;

  constructor(private config: ConfigService) {}

  private get secret(): string {
    const s = this.config.get<string>('JWT_SECRET');
    if (!s) throw new ServiceUnavailableException('JWT_SECRET not configured');
    return s;
  }

  private sign(payloadB64: string): string {
    return crypto.createHmac('sha256', this.secret).update(payloadB64).digest('base64url');
  }

  login(username: string, password: string): { token: string; expires_at: string } {
    if (Date.now() < this.lockedUntil) {
      throw new UnauthorizedException('Too many failed attempts. Try again in a few minutes.');
    }

    const expectedUser = this.config.get<string>('ADMIN_USERNAME');
    const expectedPass = this.config.get<string>('ADMIN_PASSWORD');
    if (!expectedUser || !expectedPass) {
      throw new ServiceUnavailableException(
        'Admin login is not configured: set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env',
      );
    }

    const userOk = safeEqual(username ?? '', expectedUser);
    const passOk = safeEqual(password ?? '', expectedPass);
    if (!userOk || !passOk) {
      this.failures += 1;
      if (this.failures >= MAX_FAILURES) {
        this.lockedUntil = Date.now() + LOCKOUT_MS;
        this.failures = 0;
        this.logger.warn('Admin login locked for 15 minutes after repeated failures');
      }
      throw new UnauthorizedException('Wrong username or password');
    }

    this.failures = 0;
    const exp = Date.now() + TOKEN_TTL_MS;
    const payloadB64 = Buffer.from(JSON.stringify({ u: expectedUser, exp })).toString('base64url');
    const token = `${payloadB64}.${this.sign(payloadB64)}`;
    this.logger.log('Admin login successful');
    return { token, expires_at: new Date(exp).toISOString() };
  }

  verify(token: string | undefined): boolean {
    if (!token) return false;
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return false;
    try {
      const expected = this.sign(payloadB64);
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      return typeof payload?.exp === 'number' && payload.exp > Date.now();
    } catch {
      return false;
    }
  }
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}
