-- Escalation daily call limit + backup caller IDs (branch feature/escalation-call-limit).
--
-- Apply this instead of `prisma db push`: the production database also holds
-- tables Prisma does not manage (e.g. public.ie_document_files -> auth.users),
-- and db push would try to drop them. Everything below is additive only and
-- safe to re-run (IF NOT EXISTS guards).

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "backup_from_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "escalation_call_gap_hours" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "escalation_calls_per_day" INTEGER,
  ADD COLUMN IF NOT EXISTS "vobiz_auth_id" TEXT,
  ADD COLUMN IF NOT EXISTS "vobiz_auth_token" TEXT;

ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "from_number" TEXT;

CREATE TABLE IF NOT EXISTS "caller_number_checks" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vobiz_found" BOOLEAN,
    "vobiz_status" TEXT,
    "vobiz_blocked" BOOLEAN,
    "vobiz_trial" BOOLEAN,
    "vobiz_voice_enabled" BOOLEAN,
    "vobiz_kyc_pending" BOOLEAN,
    "vobiz_checked_at" TIMESTAMP(3),
    "vobiz_error" TEXT,
    "test_to" TEXT,
    "test_execution_id" TEXT,
    "test_status" TEXT,
    "test_detail" TEXT,
    "test_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "caller_number_checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "caller_number_checks_test_execution_id_key"
  ON "caller_number_checks"("test_execution_id");

CREATE UNIQUE INDEX IF NOT EXISTS "caller_number_checks_business_id_phone_key"
  ON "caller_number_checks"("business_id", "phone");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'caller_number_checks_business_id_fkey'
  ) THEN
    ALTER TABLE "caller_number_checks"
      ADD CONSTRAINT "caller_number_checks_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backend-only table: RLS on with no policies blocks Supabase's public API,
-- same as "businesses". Prisma connects as the owner and is unaffected.
ALTER TABLE "caller_number_checks" ENABLE ROW LEVEL SECURITY;
