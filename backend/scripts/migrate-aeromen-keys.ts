/**
 * One-time key migration for the existing live client (Aeromen).
 *
 *   npm run billing:migrate-aeromen
 *
 * Copies the platform env keys (BOLNA_API_KEY, BOLNA_AGENT_ID,
 * AISENSY_API_KEY) into Aeromen's tenant record, encrypted with
 * BILLING_ENCRYPTION_KEY, so calling and WhatsApp keep working after services
 * read keys from tenant records. The env fallback also stays in place, so
 * running this is safe at any time and idempotent (existing tenant keys are
 * never overwritten unless --force is passed).
 *
 * Target selection: AEROMEN_BUSINESS_ID env var if set, otherwise the single
 * business whose name contains "aeromen" (case-insensitive).
 */
import 'dotenv/config';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force');
const PREFIX = 'enc:v1:';

// Mirrors backend/src/modules/billing/crypto.service.ts exactly
function masterKey(): Buffer {
  const raw = process.env.BILLING_ENCRYPTION_KEY;
  if (!raw) {
    console.error('ERROR: BILLING_ENCRYPTION_KEY is not set in .env: add it first (any strong passphrase or 64-char hex).');
    process.exit(1);
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

async function main() {
  const bolnaKey = process.env.BOLNA_API_KEY;
  const bolnaAgent = process.env.BOLNA_AGENT_ID;
  const aisensyKey = process.env.AISENSY_API_KEY;

  if (!bolnaKey && !aisensyKey) {
    console.error('ERROR: neither BOLNA_API_KEY nor AISENSY_API_KEY found in env: nothing to migrate.');
    process.exit(1);
  }

  // Locate Aeromen
  let business;
  if (process.env.AEROMEN_BUSINESS_ID) {
    business = await prisma.business.findUnique({ where: { id: process.env.AEROMEN_BUSINESS_ID } });
  } else {
    const matches = await prisma.business.findMany({
      where: { name: { contains: 'aeromen', mode: 'insensitive' } },
    });
    if (matches.length > 1) {
      console.error('ERROR: multiple businesses match "aeromen". Set AEROMEN_BUSINESS_ID in .env to pick one:');
      matches.forEach((m) => console.error(`  ${m.id}  ${m.name}`));
      process.exit(1);
    }
    business = matches[0];
  }

  if (!business) {
    console.error('ERROR: could not find the Aeromen business. Set AEROMEN_BUSINESS_ID in .env.');
    process.exit(1);
  }

  console.log(`Target tenant: ${business.name} (${business.id})`);

  const data: Record<string, string> = {};
  if (bolnaKey) {
    if (business.bolna_api_key && !FORCE) {
      console.log('= Bolna key already set on tenant record (use --force to overwrite)');
    } else {
      data.bolna_api_key = encrypt(bolnaKey);
      console.log(`+ Bolna API key will be stored (ends ...${bolnaKey.slice(-4)})`);
    }
  }
  if (bolnaAgent) {
    if (business.bolna_agent_id && !FORCE) {
      console.log('= Bolna agent id already set on tenant record');
    } else {
      data.bolna_agent_id = bolnaAgent;
      console.log(`+ Bolna agent id will be stored (${bolnaAgent})`);
    }
  }
  if (aisensyKey) {
    if (business.aisensy_api_key && !FORCE) {
      console.log('= AiSensy key already set on tenant record (use --force to overwrite)');
    } else {
      data.aisensy_api_key = encrypt(aisensyKey);
      console.log(`+ AiSensy API key will be stored (ends ...${aisensyKey.slice(-4)})`);
    }
  }

  if (Object.keys(data).length === 0) {
    console.log('\nNothing to do: all keys already present on the tenant record.');
  } else {
    await prisma.business.update({ where: { id: business.id }, data });
    console.log('\nKeys migrated to the tenant record (encrypted at rest).');
  }

  // Mark keys-added if still pending
  const fresh = await prisma.business.findUnique({ where: { id: business.id } });
  if (fresh?.onboarding_status === 'PENDING' && fresh.bolna_api_key && fresh.aisensy_api_key) {
    await prisma.business.update({
      where: { id: business.id },
      data: { onboarding_status: 'KEYS_ADDED' },
    });
    console.log('Onboarding status moved PENDING -> KEYS_ADDED.');
  }

  console.log(`
──────────────────────────────────────────────────────────────
POST-MIGRATION CHECKLIST (verify BEFORE the next scheduled batch)
──────────────────────────────────────────────────────────────
 1. Open /admin/tenants/${business.id} and confirm:
    · Bolna key preview shows the expected last-4
    · Bolna agent id matches the live agent
    · AiSensy key preview shows the expected last-4
 2. Click "Poll Bolna now" and confirm the balance appears.
 3. Make ONE manual test call from the dashboard and confirm it rings.
 4. Send ONE WhatsApp statement to a test number and confirm delivery.
 5. Only then rely on the next scheduled batch. The env keys stay as a
    fallback, so nothing breaks even if a step is missed.
──────────────────────────────────────────────────────────────`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
