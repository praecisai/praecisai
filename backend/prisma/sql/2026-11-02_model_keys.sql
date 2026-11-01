-- Models B and C get the same connection settings as model A: Bolna API key
-- and agent id, outbound + backup caller IDs, Vobiz login and AiSensy key.
-- Model A's keep living on "businesses".
--
-- Apply this instead of `prisma db push` (the production database holds
-- tables Prisma does not manage). Additive only and safe to re-run.

CREATE TABLE IF NOT EXISTS "business_model_keys" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "bolna_api_key" TEXT,
    "bolna_agent_id" TEXT,
    "bolna_from_number" TEXT,
    "backup_from_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vobiz_auth_id" TEXT,
    "vobiz_auth_token" TEXT,
    "aisensy_api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_model_keys_pkey" PRIMARY KEY ("id")
);

-- Same as businesses / credit_accounts: RLS on with no policies, so the
-- public Supabase API cannot read these (encrypted) keys; the backend's
-- database role is unaffected.
ALTER TABLE "business_model_keys" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS "business_model_keys_business_id_tier_key"
  ON "business_model_keys"("business_id", "tier");

DO $$ BEGIN
  ALTER TABLE "business_model_keys"
    ADD CONSTRAINT "business_model_keys_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Carry over the B / C agent ids already entered on the business record
INSERT INTO "business_model_keys" ("id", "business_id", "tier", "bolna_agent_id", "updated_at")
SELECT gen_random_uuid()::text, "id", 'B', "bolna_agent_id_b", CURRENT_TIMESTAMP
FROM "businesses" WHERE "bolna_agent_id_b" IS NOT NULL AND "bolna_agent_id_b" <> ''
ON CONFLICT ("business_id", "tier") DO NOTHING;

INSERT INTO "business_model_keys" ("id", "business_id", "tier", "bolna_agent_id", "updated_at")
SELECT gen_random_uuid()::text, "id", 'C', "bolna_agent_id_c", CURRENT_TIMESTAMP
FROM "businesses" WHERE "bolna_agent_id_c" IS NOT NULL AND "bolna_agent_id_c" <> ''
ON CONFLICT ("business_id", "tier") DO NOTHING;
