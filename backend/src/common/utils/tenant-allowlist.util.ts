import { Prisma, PrismaClient } from '@prisma/client';

// Admin-created tenants record their allowed emails as allowed_emails rows
// whose note starts "tenant:<businessId>" (see AdminService.setAllowedEmails).
const TENANT_NOTE = /^tenant:([0-9a-f-]{36})/i;

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The admin-created tenant this email was allowlisted for, or null. A login
 * with such an email must join that tenant on first sign-in, never get an
 * auto-provisioned business of its own.
 */
export async function allowlistedTenantFor(db: Db, email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  // Rows added by hand in the Supabase table editor may not be lowercase
  const row = await db.allowedEmail.findFirst({
    where: { email: { equals: email.trim(), mode: 'insensitive' } },
    select: { note: true },
  });
  const businessId = row?.note ? TENANT_NOTE.exec(row.note)?.[1] : null;
  if (!businessId) return null;
  const business = await db.business.findUnique({ where: { id: businessId }, select: { id: true } });
  return business?.id ?? null;
}
