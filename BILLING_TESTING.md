# Billing, Payments, Usage & Admin: Local Testing Guide

Branch: `feature/billing-admin`. Everything below works WITHOUT a Razorpay
account: until real keys exist the module runs in **mock mode** and the UI
offers "Simulate payment" buttons that exercise the exact same activation
code paths the real webhooks use.

## 1. One-time setup (already done by the build)

- Prisma schema pushed (additive only) and client regenerated.
- Test coupons seeded: `TEST5`, `TEST10`, `TEST15`, `TEST20` (999 uses each).
- Aeromen's Bolna + AiSensy keys copied (encrypted) into its tenant record.
- `backend/.env` got new entries:
  - `BILLING_ENCRYPTION_KEY` : freshly generated. Do NOT change it once tenant
    keys are stored (stored keys become undecryptable; env fallback still works).
  - `ADMIN_EMAILS=aeromenclothingllp@gmail.com` : add more Praecis staff
    emails comma-separated. Only these emails can open `/admin`; everyone
    else sees a plain 404.

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
4. **Admin panel** (`/admin`, only for ADMIN_EMAILS):
   - Tenants: health table (Bolna balance · mandate · calls · onboarding).
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
