-- Prepaid credits (call minutes + WhatsApp messages), autopay, and the three
-- AI calling model tiers (A best, B 2nd best, C 3rd best).
--
-- Apply this instead of `prisma db push`: the production database also holds
-- tables Prisma does not manage (e.g. public.ie_document_files -> auth.users),
-- and db push would try to drop them. Everything below is additive only and
-- safe to re-run (IF NOT EXISTS / ON CONFLICT guards). Existing businesses get
-- credit_billing = false, so nothing changes for them until the admin turns
-- credits on.

-- Postgres cannot add an enum value inside a transaction block on old
-- versions; Supabase runs PG15 where this is fine, and IF NOT EXISTS makes it
-- re-runnable.
ALTER TYPE "BillingPaymentType" ADD VALUE IF NOT EXISTS 'CREDITS';

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "bolna_agent_id_b" TEXT,
  ADD COLUMN IF NOT EXISTS "bolna_agent_id_c" TEXT,
  ADD COLUMN IF NOT EXISTS "call_model_tier" TEXT NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS "credit_billing" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "billing_payments"
  ADD COLUMN IF NOT EXISTS "credit_kind" TEXT,
  ADD COLUMN IF NOT EXISTS "credit_pack" TEXT,
  ADD COLUMN IF NOT EXISTS "credit_units" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "is_autopay" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "credit_accounts" (
    "business_id" TEXT NOT NULL,
    "call_credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "whatsapp_credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "call_low_threshold" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "whatsapp_low_threshold" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "call_low_alerted" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_low_alerted" BOOLEAN NOT NULL DEFAULT false,
    "autopay_enabled" BOOLEAN NOT NULL DEFAULT false,
    "autopay_call_pack" TEXT,
    "autopay_whatsapp_pack" TEXT,
    "autopay_status" TEXT NOT NULL DEFAULT 'NONE',
    "autopay_method" TEXT,
    "razorpay_token_id" TEXT,
    "autopay_setup_order_id" TEXT,
    "autopay_last_error" TEXT,
    "autopay_last_charge_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_accounts_pkey" PRIMARY KEY ("business_id")
);

CREATE TABLE IF NOT EXISTS "credit_transactions" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "call_model_tiers" (
    "tier" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "demo_agent_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "call_model_tiers_pkey" PRIMARY KEY ("tier")
);

CREATE INDEX IF NOT EXISTS "credit_transactions_business_id_created_at_idx"
  ON "credit_transactions"("business_id", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_kind_reason_ref_id_key"
  ON "credit_transactions"("kind", "reason", "ref_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_accounts_business_id_fkey') THEN
    ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_transactions_business_id_fkey') THEN
    ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "credit_accounts" ADD COLUMN IF NOT EXISTS "autopay_setup_order_id" TEXT;

-- The three models. Labels/descriptions are editable in /admin/models.
INSERT INTO "call_model_tiers" ("tier", "label", "description", "active", "updated_at") VALUES
  ('A', 'Model A · Best', 'Our best and most natural AI voice. The model in use today.', true, CURRENT_TIMESTAMP),
  ('B', 'Model B · 2nd best', 'A strong, lower-cost AI voice.', true, CURRENT_TIMESTAMP),
  ('C', 'Model C · 3rd best', 'The most economical AI voice.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("tier") DO NOTHING;

-- These tables are only read through the backend (service role). Enable RLS
-- with no policies so the public Supabase API cannot read or write them.
ALTER TABLE "credit_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "call_model_tiers" ENABLE ROW LEVEL SECURITY;
