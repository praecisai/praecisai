# PDC cheque reminder: AiSensy template and setup

The backend sends this two days before a pending PDC cheque's date, at the
tenant's earliest WhatsApp slot (Settings · Schedule). Until the template and
the API campaign below exist in AiSensy, every send fails with a template error.

Backend contract:

- Campaign name: `pdc_cheque_reminder_v1` (override with the `AISENSY_CAMPAIGN_PDC_REMINDER` env var)
- Endpoint: `POST https://backend.aisensy.com/campaign/t1/api/v2`, no media
- `templateParams` order: `[party name, business name, cheque number(s), cheque date, amount, presentation date]`

## 1. Create the template

AiSensy → **Manage → Template Messages → New Template Message**

| Field | Value |
| --- | --- |
| Template Category | `UTILITY` |
| Template Language | `English` |
| Time-To-Live (TTL) | leave off |
| Template Name | `pdc_cheque_reminder` |
| Template Type | `Text` (no header, no media) |
| Interactive Actions | `None` |

**Template Format (body)** — paste exactly this:

```
Hello {{1}},

Reminder from {{2}}: Cheque no. {{3}} dated {{4}} for Rs. {{5}} is due in 2 days and will be presented on date {{6}}.

Please ensure sufficient balance in your account for smooth clearance.

Thank you.
```

The numbering is not cosmetic: Meta rejects a body whose variables are not in
ascending order of appearance with "invalid parameter ordering", so `{{2}}` has
to be the business name here, not the cheque number.

**Template Footer** (optional, 60 characters max, no variables allowed):

```
Automated reminder. Ignore if already funded.
```

**Sample values.** AiSensy asks for one sample per variable before it will submit
the template (Meta rejects samples that are empty, that are placeholders like
"XYZ", or that contain a URL or a phone number). Use real-looking data in the
exact format the backend sends:

| Variable | What the backend sends | Sample to enter |
| --- | --- | --- |
| `{{1}}` | Party name, as stored on the cheque | `AYUSH FASHION (DHAYARI)` |
| `{{2}}` | Business name as set by the Praecis admin | `Aeromen Clothing LLP` |
| `{{3}}` | Cheque number, or several comma-separated when a party has more than one cheque due the same day | `456789` |
| `{{4}}` | Cheque date, `DD/MM/YYYY` | `20/08/2026` |
| `{{5}}` | Amount in Indian digit grouping, no `Rs.` prefix and no decimals: the template already says "Rs." | `79,000` |
| `{{6}}` | Presentation date, the same cheque date as `{{4}}` | `20/08/2026` |

With those samples the preview on the right reads:

```
Hello AYUSH FASHION (DHAYARI),

Reminder from Aeromen Clothing LLP: Cheque no. 456789 dated 20/08/2026 for Rs. 79,000 is due in 2 days and will be presented on date 20/08/2026.

Please ensure sufficient balance in your account for smooth clearance.

Thank you.

Automated reminder. Ignore if already funded.
```

A party with three cheques due the same day gets one message where `{{3}}` is
`456789, 456790, 456791` and `{{5}}` is the total of the three.

Submit and wait for Meta approval (usually minutes, sometimes a few hours).

Two rules Meta enforces that this body already satisfies: the body may not start
or end with a variable, and the message must read as transactional, not
promotional, or the UTILITY category gets rejected.

## 2. Create the API campaign

The API sends a *campaign* name, not a template name, exactly like the four
statement templates.

AiSensy → **Campaigns → API Campaign → Create**

- Pick the approved `pdc_cheque_reminder` template
- Name the campaign `pdc_cheque_reminder_v1`
- Save, and copy the name exactly

If AiSensy refuses that name because it is taken, use any other name and set
`AISENSY_CAMPAIGN_PDC_REMINDER` on Railway to the name you used.

## 3. Check it end to end

1. Settings · Schedule: **Cheque due reminder** switched on, and at least one
   WhatsApp slot chosen (the reminder goes out at the earliest one).
2. PDC page: add a cheque for a party that has a phone number, dated **two days
   from today**.
3. At the slot hour, the party receives the message and the PDC row shows
   "reminder sent". The Activity feed logs it as a PDC reminder, SENT or FAILED
   with the Meta reason.

## Behaviour worth knowing

- The reminder ignores the weekday and month filters in Settings: a cheque date
  is a bank date, so a reminder postponed to the next allowed day is useless.
- One message per party per day, listing every cheque of theirs due that date.
- `pdc_cheques.reminder_sent_at` makes it idempotent: a second WhatsApp slot, a
  worker retry or a redeploy can never send the same reminder twice.
- Only cheques still `PENDING` and matched to a customer with a phone number are
  reminded. VIPs are excluded, like every other automated contact.
- Changing the two-day window in `pdc-reminder.processor.ts` means editing the
  approved template text too, since "in 2 days" is fixed text there.
