# Sales sheet: one Google Sheet row per successful payment

Every captured payment (paid trial, full onboarding, monthly auto-debit) appends
a row with the buyer's business name, email, mobile, plan and amount.

The backend talks to an **Apps Script web app** that you own, not to the Google
Sheets API. There is no Google Cloud project, no service account and no key file
to rotate: the script runs as the sheet's owner, and a shared secret in the
request body is what stops anyone else appending rows.

Nothing here can break a payment. The call is fire-and-forget with a 10s
timeout, and every failure is swallowed and logged.

## 1. Create the sheet

New Google Sheet, any name. The script creates and formats the `Payments` tab
itself on the first write, so no headers are needed up front.

## 2. Add the script

In the sheet: **Extensions > Apps Script**. Delete whatever is in `Code.gs` and
paste this, replacing `PASTE_A_LONG_RANDOM_STRING_HERE` with a long random
string (keep it: it goes into Railway in step 4).

```javascript
const SECRET = 'PASTE_A_LONG_RANDOM_STRING_HERE';
const SHEET_NAME = 'Payments';

const HEADERS = [
  'Paid at (IST)', 'Business', 'Email', 'Mobile', 'Plan', 'Amount',
  'Amount (paise)', 'Type', 'GSTIN', 'Razorpay payment id', 'Business id',
  'Payment record id',
];

// Column holding payment_record_id, used for the duplicate check (1-indexed).
const ID_COL = 12;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!SECRET || body.secret !== SECRET) {
      return reply({ ok: false, error: 'unauthorized' });
    }

    const row = body.row || {};
    const sheet = getSheet();

    // Idempotency. Razorpay's webhook and the browser's checkout callback can
    // both report the same payment, and Razorpay retries webhooks: without
    // this the same sale would show up two or three times.
    if (row.payment_record_id && alreadyLogged(sheet, row.payment_record_id)) {
      return reply({ ok: true, duplicate: true });
    }

    sheet.appendRow([
      row.paid_at || '',
      row.business_name || '',
      row.email || '',
      row.phone || '',
      row.plan || '',
      row.amount || '',
      row.amount_paise || '',
      row.payment_type || '',
      row.gstin || '',
      row.razorpay_payment_id || '',
      row.business_id || '',
      row.payment_record_id || '',
    ]);

    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function alreadyLogged(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false; // headers only
  const ids = sheet.getRange(2, ID_COL, lastRow - 1, 1).getValues();
  return ids.some(function (r) { return String(r[0]) === String(id); });
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy it

**Deploy > New deployment > (gear) Web app**, then:

- **Execute as:** Me
- **Who has access:** Anyone

Click Deploy and authorize when Google asks. Google will warn that the app is
unverified: that is expected for your own script. Choose **Advanced > Go to
(project name)** and allow it.

Copy the **Web app URL** (it looks like
`https://script.google.com/macros/s/AKfy.../exec`).

> Re-deploying after any script edit: use **Deploy > Manage deployments >
> (pencil) > Version: New version**. Creating a *new deployment* instead gives
> you a different URL and the backend keeps writing to the old one.

## 4. Set the backend env vars

On Railway (and in `backend/.env` for local testing):

```
SALES_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/AKfy.../exec
SALES_SHEET_WEBHOOK_SECRET=the same long random string from step 2
```

Both are optional. With `SALES_SHEET_WEBHOOK_URL` unset the logging is a silent
no-op, so nothing breaks in environments that have no sheet.

## 5. Test without taking a real payment

In mock/test mode, the dev simulator endpoints mark a payment PAID and therefore
append a row:

- `POST /api/v1/billing/dev/simulate-trial-paid`
- `POST /api/v1/billing/dev/simulate-onboarding-paid`
- `POST /api/v1/billing/dev/simulate-monthly-charge`

Watch the backend log for `Sales sheet row appended for <business> (<plan>)`, or
`Sales sheet webhook returned <status>` if the secret or URL is wrong.

## What lands in each column

| Column | Source |
|---|---|
| Paid at (IST) | `billing_payments.paid_at`, rendered in Asia/Kolkata |
| Business | `businesses.name` |
| Email | The BUSINESS_OWNER login; falls back to `billing_email` |
| Mobile | `users.phone` of that owner: blank for accounts that predate the field |
| Plan | "15-day trial", "10-day trial", "Full onboarding (includes first month)", "Monthly subscription" |
| Amount | Rupees, from `total_amount` paise |
| Type | TRIAL / ONBOARDING / SUBSCRIPTION |
