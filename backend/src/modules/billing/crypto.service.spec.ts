import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

function makeService(key?: string): CryptoService {
  const config = {
    get: (k: string) => (k === 'BILLING_ENCRYPTION_KEY' ? key : undefined),
  } as unknown as ConfigService;
  return new CryptoService(config);
}

describe('CryptoService (AES-256-GCM tenant key encryption)', () => {
  const service = makeService('a-strong-local-passphrase');

  it('round-trips a value', () => {
    const secret = 'bn-1234567890abcdef';
    const stored = service.encrypt(secret);
    expect(stored).not.toContain(secret);
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(service.decrypt(stored)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = service.encrypt('same-value');
    const b = service.encrypt('same-value');
    expect(a).not.toBe(b);
    expect(service.decrypt(a)).toBe('same-value');
    expect(service.decrypt(b)).toBe('same-value');
  });

  it('rejects tampered ciphertext (GCM auth tag)', () => {
    const stored = service.encrypt('secret-key');
    const raw = Buffer.from(stored.slice('enc:v1:'.length), 'base64');
    raw[raw.length - 1] ^= 0xff; // flip a ciphertext bit
    const tampered = 'enc:v1:' + raw.toString('base64');
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('supports a 64-char hex master key directly', () => {
    const hexService = makeService('a'.repeat(64));
    const stored = hexService.encrypt('value');
    expect(hexService.decrypt(stored)).toBe('value');
  });

  it('last4 exposes only the final 4 characters', () => {
    const stored = service.encrypt('bn-1234567890abcdef');
    expect(service.last4(stored)).toBe('cdef');
    expect(service.last4(null)).toBeNull();
  });

  it('throws a clear error when the master key is missing', () => {
    const bare = makeService(undefined);
    expect(() => bare.encrypt('x')).toThrow(/BILLING_ENCRYPTION_KEY/);
  });
});
