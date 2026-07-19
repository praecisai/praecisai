import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const PREFIX = 'enc:v1:';

/**
 * AES-256-GCM encryption for per-tenant third-party API keys.
 *
 * Master key comes from env BILLING_ENCRYPTION_KEY: either a 64-char hex
 * string (used as-is) or any passphrase (SHA-256 derived). Stored format is
 * `enc:v1:<base64(iv | authTag | ciphertext)>` so encrypted values are
 * self-identifying and a legacy plaintext value can be detected.
 *
 * Decrypted values must NEVER be logged or returned by any API.
 */
@Injectable()
export class CryptoService {
  constructor(private config: ConfigService) {}

  private key(): Buffer {
    const raw = this.config.get<string>('BILLING_ENCRYPTION_KEY');
    if (!raw) {
      throw new InternalServerErrorException(
        'BILLING_ENCRYPTION_KEY is not configured: cannot handle tenant API keys',
      );
    }
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    return crypto.createHash('sha256').update(raw).digest();
  }

  isEncrypted(value: string | null | undefined): boolean {
    return !!value && value.startsWith(PREFIX);
  }

  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key(), iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
  }

  decrypt(stored: string): string {
    if (!this.isEncrypted(stored)) {
      // Legacy plaintext value (should not happen after migration): pass through
      return stored;
    }
    const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /** Safe display preview: only the last 4 characters ever leave the backend. */
  last4(storedOrPlain: string | null | undefined): string | null {
    if (!storedOrPlain) return null;
    const plain = this.isEncrypted(storedOrPlain) ? this.decrypt(storedOrPlain) : storedOrPlain;
    return plain.length <= 4 ? plain : plain.slice(-4);
  }
}
