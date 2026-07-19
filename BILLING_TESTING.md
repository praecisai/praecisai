# Billing, Payments, Usage & Admin: Local Testing Guide

Branch: `feature/billing-admin`. Everything below works WITHOUT a Razorpay
account: until real keys exist the module runs in **mock mode** and the UI
offers "Simulate payment" buttons that exercise the exact same activation
code paths the real webhooks use.

## 1. One-time setup (already done by the build)

- Prisma schema pushed (additive only) and client regenerated.
- Coupons seeded: test codes `TEST5/10/15/20` plus real marketing codes
  `TRY05` 5% · `SAVE10` 10% · `WELCOME15` 15% · `FLASH20` 20% · `FESTIVE25` 25% · `BUNDLE30` 30% (multi-use).
- Aeromen's Bolna + AiSensy keys copied (encrypted) into its tenant record.
- `backend/.env` got new entries:
  - `BILLING_ENCRYPTION_KEY` : freshly generated. Do NOT change it once tenant
    keys are stored (stored keys become undecryptable; env fallback still works).
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD` : credential login for /admin. The
    panel is fully separate from the Google login: open /admin and sign in
    with these. Wrong credentials lock the login for 15 min after 8 tries.

## 2. Where the Razorpay keys go (later, after KYC)

In `backend/.env` (placeholders are already there, commented):

```
RAZORPAY_KEY_ID=rzp_test_xxxxx        # from Razorpay Dashboard → API Keys (Test mode first)
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx         # set when creating the webhook in Razorpay Dashboard
RAZORPAY_PLAN_ID=plan_xxxxx           # optional: otherwise the app creates the ₹5,900 plan once and logs the id
BILLING_ANCHOR_MODE=IMMEDIATE_NEXT_FIRST   # or FIRST_AFTER_FULL_MONTH
```

The moment BOTH key id and secret exist, mock mode turns off automatically
(the simulate endpoints then refuse with 403). To force mock mode even with
keys present: `RAZORPAY_MOCK=true`.

Webhook URL to register in the Razorpay dashboard (needs a public URL or a
tunnel like ngrok when testing locally):
`https://<your-backend>/api/v1/billing/razorpay/webhook`
Events: `payment.captured`, `subscription.charged`, `subscription.halted`,
`subscription.pending`, `subscription.activated`, `subscription.authenticated`,
`subscription.cancelled`.

## 3. Testing the full flow WITHOUT Razorpay (mock mode: current state)

Start both apps as usual (`npm run start:dev` in `backend`, `npm run dev` in
`praecisai`), log in, then:

1. **Onboarding payment**: Dashboard → Billing & Usage → "Pay onboarding fee"
   (or `/dashboard/billing/onboarding`).
   - Enter `TEST10` → Apply. The card live-updates: ₹50,000 - ₹5,000 discount
     = ₹45,000 (₹40,000 setup + ₹5,000 first month) + ₹8,100 GST = **₹53,100**.
   - Click Pay → since no Razorpay keys exist you get the amber "test mode"
     card → **Simulate payment**. This runs the real `payment.captured`
     handler: payment saved with the split, coupon burned, tenant moved to
     PAID, GST invoice `PRAE/26-27/0001` generated as a PDF.
2. **Billing & Usage** (`/dashboard/billing`):
   - Subscription card shows next debit (1st of next month), mandate status,
     the onboarding split, and the invoice with PDF download.
   - "Simulate monthly debit" at the bottom fakes a `subscription.charged`:
     new payment + monthly invoice + DEBIT_SUCCESS notification.
   - Usage section shows calls / minutes / WhatsApp counts for any month.
3. **Mandate failure / paused campaigns**: run
   `POST /api/v1/billing/dev/simulate-mandate-failure` (with your auth token),
   or from the browser console on the dashboard:
   the red banner appears on the dashboard and Billing, and bulk call
   dispatch is blocked with a clear reason until a (simulated) charge succeeds.
4. **Trial plan (paywall)**: a fresh login that is not allowlisted/paid lands
   on the plans screen (Trial ₹10,000 (10 days) · Onboarding ₹50,000 · ₹5,000/month).
   "Start 10-day trial" → in mock mode "Simulate trial payment" activates 10
   days of full access (trial invoice + banner with days left on the
   dashboard and Billing). When the 10 days end, access closes automatically
   and the plans screen returns with "trial already used".
5. **Admin panel** (`/admin`, credential login viru-admin + password):
   - Tenants: health table (Bolna balance · mandate · calls · onboarding · trial).
   - Tenant detail: settings, write-only keys (last-4 previews + Replace key),
     onboarding checklist with the manual "Test call passed" toggle,
     "Poll Bolna now", "Link signed-up users".
   - Notifications, Coupons (create/deactivate, see who used what), Billing
     (per-tenant payments + invoices).

## 4. What changes with real Razorpay test keys

Same flow, but the Pay button opens the real Razorpay Checkout (test cards /
test UPI), and activation happens through the real webhook. Use Razorpay
test mode first; the webhook needs a public tunnel locally.

## 5. Aeromen safety checklist (key migration already ran)

Before the next scheduled batch: open `/admin/tenants` → Aeromen Clothing →
verify key previews, click "Poll Bolna now", make one manual test call, send
one WhatsApp statement. The old env keys remain as fallback, so nothing
breaks even if a step is skipped.

## 6. Useful commands

```
cd backend
npm test                          # full suite (split/GST math, anchor dates, webhook signatures, crypto)
npm run billing:seed              # re-seed test coupons
npm run billing:migrate-aeromen   # idempotent; --force to overwrite stored keys
```
