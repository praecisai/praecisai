/**
 * Seed test coupons for local billing testing (Razorpay mock/test mode).
 *
 *   npm run billing:seed
 *
 * Creates TEST5 / TEST10 / TEST15 / TEST20 with generous max_uses so they can
 * be reused across local test runs. Existing codes are left untouched.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const coupons = [
    { code: 'TEST5', percent: 5 },
    { code: 'TEST10', percent: 10 },
    { code: 'TEST15', percent: 15 },
    { code: 'TEST20', percent: 20 },
  ];

  for (const c of coupons) {
    const existing = await prisma.coupon.findUnique({ where: { code: c.code } });
    if (existing) {
      console.log(`= ${c.code} already exists (${existing.percent}%, used ${existing.used_count}/${existing.max_uses})`);
      continue;
    }
    await prisma.coupon.create({
      data: { code: c.code, percent: c.percent, max_uses: 999, active: true },
    });
    console.log(`+ Created ${c.code} (${c.percent}% off, 999 uses)`);
  }

  console.log('\nTest coupons ready. Use any of them on the onboarding payment page.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
