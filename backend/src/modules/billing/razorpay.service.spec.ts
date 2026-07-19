import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';

function makeService(env: Record<string, string>): RazorpayService {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new RazorpayService(config);
}

const WEBHOOK_SECRET = 'whsec_test_123';

function sign(body: string, secret = WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('RazorpayService webhook signature verification', () => {
  const service = makeService({
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'test_secret',
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
  });

  const body = JSON.stringify({ event: 'subscription.charged', payload: { amount: 590000 } });

  it('accepts a correctly signed payload', () => {
    expect(service.verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it('accepts a Buffer body signed over the same bytes', () => {
    const buf = Buffer.from(body, 'utf8');
    expect(service.verifyWebhookSignature(buf, sign(body))).toBe(true);
  });

  it('rejects a tampered payload (amount changed after signing)', () => {
    const signature = sign(body);
    const tampered = body.replace('590000', '1'); // attacker rewrites the amount
    expect(service.verifyWebhookSignature(tampered, signature)).toBe(false);
  });

  it('rejects a signature produced with the wrong secret', () => {
    expect(service.verifyWebhookSignature(body, sign(body, 'wrong_secret'))).toBe(false);
  });

  it('rejects a missing signature', () => {
    expect(service.verifyWebhookSignature(body, undefined)).toBe(false);
  });

  it('rejects a malformed signature without throwing', () => {
    expect(service.verifyWebhookSignature(body, 'not-hex')).toBe(false);
    expect(service.verifyWebhookSignature(body, '')).toBe(false);
  });

  it('rejects everything when no webhook secret is configured', () => {
    const noSecret = makeService({ RAZORPAY_KEY_ID: 'k', RAZORPAY_KEY_SECRET: 's' });
    expect(noSecret.verifyWebhookSignature(body, sign(body))).toBe(false);
  });
});

describe('RazorpayService checkout-callback signature', () => {
  const service = makeService({
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'test_secret',
  });

  it('verifies HMAC(payment_id|subscription_id)', () => {
    const paymentId = 'pay_abc';
    const subscriptionId = 'sub_xyz';
    const good = crypto
      .createHmac('sha256', 'test_secret')
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');
    expect(
      service.verifySubscriptionPaymentSignature({ paymentId, subscriptionId, signature: good }),
    ).toBe(true);
    expect(
      service.verifySubscriptionPaymentSignature({ paymentId, subscriptionId: 'sub_other', signature: good }),
    ).toBe(false);
  });
});

describe('RazorpayService mock mode', () => {
  it('is mock without keys and creates sub_mock_* subscriptions', async () => {
    const service = makeService({});
    expect(service.isMock).toBe(true);
    const sub = await service.createSubscription({
      planId: 'plan_x',
      startAt: new Date(),
      upfrontPaise: 5310000,
      upfrontLabel: 'test',
      notes: {},
    });
    expect(sub.id).toMatch(/^sub_mock_/);
  });

  it('is NOT mock when both keys exist', () => {
    const service = makeService({ RAZORPAY_KEY_ID: 'k', RAZORPAY_KEY_SECRET: 's' });
    expect(service.isMock).toBe(false);
  });

  it('RAZORPAY_MOCK=true forces mock even with keys', () => {
    const service = makeService({ RAZORPAY_KEY_ID: 'k', RAZORPAY_KEY_SECRET: 's', RAZORPAY_MOCK: 'true' });
    expect(service.isMock).toBe(true);
  });
});
