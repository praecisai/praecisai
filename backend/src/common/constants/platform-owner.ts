// Platform-owner accounts: the PraecisAI team's own logins. These always
// bypass the paywall and every entitlement gate, regardless of billing state,
// allowlist rows, or trial status — so the owner can log into the live product
// and use it the moment API keys are set for their business in the admin panel.
//
// Extra emails can be added via the PLATFORM_OWNER_EMAILS env var (comma-
// separated); the hardcoded entry guarantees at least the primary owner even if
// the env is missing. Compared lowercase.
const HARDCODED_OWNER_EMAILS = ['praecisai@gmail.com'];

export function platformOwnerEmails(): string[] {
  const fromEnv = (process.env.PLATFORM_OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...HARDCODED_OWNER_EMAILS, ...fromEnv]));
}

export function isPlatformOwner(email?: string | null): boolean {
  if (!email) return false;
  return platformOwnerEmails().includes(email.toLowerCase());
}
