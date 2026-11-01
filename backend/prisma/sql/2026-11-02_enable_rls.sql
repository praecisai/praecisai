-- Turn row level security on for the public tables that still had it off.
-- With RLS on and no policies, the public Supabase API (anon / authenticated
-- keys) can no longer read or write them. The backend connects as postgres,
-- which bypasses RLS, so it is unaffected (same as businesses, credit_accounts
-- and the other tables that already have RLS on). No database function,
-- trigger or auth hook reads these tables. Safe to re-run.

ALTER TABLE "allowed_emails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demo_agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "razorpay_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_snapshots" ENABLE ROW LEVEL SECURITY;
