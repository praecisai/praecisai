# PraecisAI: what the product does

A complete, plain-English guide to every feature, page and automation. Written
for the business using PraecisAI, not for developers.

---

## 1. In one paragraph

PraecisAI is an AI-powered payment recovery system for Indian businesses. You
export your outstanding report from Tally (or any Excel/CSV), drop it in, and
the system builds your entire receivables picture: every party, every bill, how
old each bill is, and how hard each party should be chased. From there an AI
voice agent calls parties in Hindi or English, WhatsApp sends each party a
branded statement PDF, and every response is captured, classified and reported
back to you. You keep full control: every automation has an on/off switch, VIP
customers are never contacted automatically, and you can call or message any
party by hand at any time.

---

## 2. The recovery cycle

| Step | What happens | Where |
| --- | --- | --- |
| 1. Import | Drop the outstanding Excel. Columns are detected automatically; parties, bills, cities, agents and phone numbers are created or updated. | Import Center |
| 2. Segment | Every bill is aged and every party lands in a segment based on how overdue it is. | Automatic |
| 3. Contact | AI calls and WhatsApp statements go out, automatically on your schedule or manually when you click. | Outstandings |
| 4. Capture | Every call is transcribed, summarised, classified, and payment promises are recorded. | Activity, Customer page |
| 5. Report | Positive, negative, escalation and segment reports, downloadable as PDF. | Reports |
| 6. Repeat | Upload the next outstanding file; paid bills close themselves, cheques auto-clear, segments recalculate. | Import Center |

---

## 3. The ideas behind everything

**Party (customer).** One entry per party in your ledger, with phone, city,
sales agent and backup numbers.

**Bill (invoice).** One row per bill: number, date, amount, due amount, days
overdue. Negative amounts are treated as credit notes or receipts, not as bills.

**Days overdue.** The age of the bill. The oldest unpaid bill decides how a
party is treated.

**Segments.** Five bands, decided by day ranges you control. The segment picks
the AI call script, the WhatsApp template and the statement colour.

| Segment | Default range | What it means |
| --- | --- | --- |
| No Follow-up | 0 days | Within credit period. **No calls, no messages, ever**: not even manual ones. Widen this range to protect fresh bills. |
| Soft Reminder | 1 to 60 days | Gentle first reminder, no pressure. |
| Follow-up | 61 to 120 days | Friendly follow-up asking for a rough date. |
| Strong Follow-up | 121 to 180 days | Firm but respectful accounts-team update. |
| Escalation | 181 days and above | Senior team involved, humble but urgent. |

Every boundary is yours to move in Settings · Segment Rules, and saving
re-segments every party instantly. WhatsApp can use its own set of ranges, and a
single party can have its own ranges too.

Two more states appear in lists: **Cleared** (nothing due) and **Credit Note**
(negative balance). Neither is contacted.

**VIP.** Starred parties. They are excluded from every automatic call, message
and callback. You reach them only by choosing to, from the Outstandings page.

**PDC.** Post-dated cheques you are holding, tracked separately.

**PTP (Promise to Pay).** A payment date a party gave on a call, recorded
automatically.

---

## 4. Page by page

### Dashboard
Your receivables at a glance: total outstanding (net of credit notes), total
parties, total bills, recovery rate, amount and count per segment, a segment pie
chart, and a live feed of recent calls and WhatsApp messages with promised dates
and scheduled callbacks.

### Customers
Every party, searchable by name or phone, filterable by city, segment, sales
agent and VIP. From here you can:
- Star or unstar a party as VIP with one click
- See backup phone numbers (the "+2" chip)
- Open **Set schedule** to give one party its own day ranges, separately for
  calls and for WhatsApp, overriding the business defaults
- Open any party for the full history

### Customer detail
Everything known about one party: contact details, total outstanding, its
segment and the day range behind it, every bill with days overdue and status,
promises to pay, the last five AI calls (status, disposition, mood, summary,
promised date and a link to the **call recording**), and the last five WhatsApp
messages with delivery status.

### Invoices
Every bill in the system with search, status filter, sales-agent filter and a
date range.

### Outstandings
The recovery workspace. Segment cards at the top (click to filter), plus filters
for search, segment, ageing bucket and VIP. From here you can:
- Type a missing phone number straight into the row (Tally exports rarely carry
  numbers) and it saves instantly
- Send one party an AI call or a WhatsApp statement, with a confirmation step
- Send the **whole segment** an AI call or WhatsApp statement in bulk
- Tick **VIP only** to target just the starred parties in that segment: this is
  the only way VIPs are ever contacted
- No Follow-up and Cleared rows deliberately have no action buttons

### VIP
The list of every starred party, with an explanation of the protection, plus a
bulk **VIP Excel upload**: a PARTY column and a VIP column with Yes/No stars or
unstars parties in one go, and unmatched names are listed back to you.

### Reports
Four reports, each downloadable as a PDF:

| Report | Contents |
| --- | --- |
| Positive | Parties responding well: willing to pay, or promised a date |
| Negative | Parties the AI cannot recover: they need your personal follow-up |
| Escalation | Every party in the Escalation range with oldest bills and call history |
| Segment Overview | All segments in detail: counts, amounts, and every party per segment |

How a party is classified (the same rules are printed on the page):
- **Willing to pay** → positive
- **Promised to pay** → positive up to 3 promises; 4 or more promises without
  payment → negative
- **Refused to pay** → negative immediately; a later promise moves them back out
- **Keeps asking to call later** → negative after more than 6 in a row
- **Not answering** → negative after more than 6 unanswered in a row
- **Unclear response** → negative after more than 6 in a row
- **Disputed the bill** → every call re-checks if the dispute is resolved;
  still disputing after more than 6 calls → negative

### Activity
One timeline of every AI call, WhatsApp message and import, filterable by type
and date and searchable. Calls show status, disposition, summary (or the real
reason a call did not connect), promised dates and recordings. Failed WhatsApp
sends show why they failed and when the retry fires.

### Import Center
Drop an Excel or CSV up to 50MB. Columns (Party, Bill No., Date, Due Amount,
Mobile, Agent, City) are detected automatically, cities are extracted out of
party names, and the file is processed in the background with a live progress
bar. Each upload is treated as your **latest** outstanding report: new bills are
added, changed dues are updated, and bills that disappeared are marked paid. You
get a full result summary (imported, failed, parties created/updated, bills
created) with the failed rows listed, plus an import history.

### PDC Cheques
Track the post-dated cheques you hold:
- Upload a PDC Excel (Party Name, Cheque No, Date, Amount, in any order), or add
  a single cheque by hand with a searchable party dropdown
- Re-uploading the same register is safe: duplicates are detected and skipped
- Party names are matched to your ledger automatically
- Stat cards: total, pending, cleared, bounced, in cooldown, and total cleared
  value
- Mark any cheque cleared or bounced by hand
- **Two days before** a pending cheque's date, the party gets a WhatsApp asking
  them to keep the account funded (see Automation below)

### Billing & Usage
- Your Praecis subscription: next auto-debit date, mandate status, what was paid
  at onboarding, and a downloadable PDF invoice for every payment
- Usage for any of the last 12 months: AI calls made, total minutes, WhatsApp
  messages sent, estimated Bolna spend, and a per-call breakdown with duration
  and cost
- Connected platforms: your live Bolna calling balance with a low-balance
  warning and a top-up link, and your AiSensy WhatsApp message count

### Settings
Four tabs:

| Tab | What you control |
| --- | --- |
| **Business** | Your business name (set by the Praecis team), the **call transfer number** a customer is handed to when they ask for a senior, your current plan and your business ID |
| **Schedule** | When automation runs: the hours, weekdays and **months** for AI calls and for WhatsApp separately, plus the cheque-reminder switch |
| **Segment Rules** | The day ranges for all five segments, a separate set of ranges for WhatsApp if you want it, and the **VIP rule** (a day range where VIPs use a chosen script) |
| **Credit Status** | Your remaining Bolna calling balance, estimated calls left and transcription credits |

The two master switches, **Auto Calls** and **Auto WhatsApp**, sit in the header
of every page. Turning one on asks for confirmation; turning it off is instant.

---

## 5. Automation in detail

### Automatic AI calls
- Default slots 12:00 PM and 4:00 PM IST, every day. You choose the hours,
  weekdays and months in Settings · Schedule.
- Calls every eligible party in Soft Reminder, Follow-up, Strong Follow-up and
  Escalation.
- Never calls: VIPs, No Follow-up, Cleared, parties in a PDC or sensitive
  cooldown, parties with no phone number, or a party already called minutes ago.
- A daily call ceiling protects you from a runaway first run.

### Automatic WhatsApp statements
- Default slot 10:00 AM IST, every day. Hours, weekdays and months are yours to
  set.
- Sends a **branded statement PDF** coloured by segment, listing every open bill
  with days overdue and the total.
- Cadence, so nobody is spammed: Soft Reminder at most once every 15 days, every
  other segment at most once every 7 days. Running daily changes nothing about
  this.
- One message per physical phone number per run, even when several parties in
  the ledger share a handset.
- A daily ceiling per business protects your WhatsApp number's quality rating.
- If a send fails on the provider's side it retries the same day about 3.5 hours
  later, then the next day at the original time, then stops and waits for the
  next cadence run. Every attempt is visible in Activity.

### PDC cheque reminder
- Two days before a pending cheque's date, the party gets a WhatsApp: cheque
  number, date, amount, and a request to keep the account funded.
- Goes out at the **first WhatsApp slot** you configured, on the day it is due,
  regardless of the weekday and month filters, because a bank date cannot wait.
- One message per party listing all their cheques due that date. Never sent
  twice. VIPs excluded. Switch it off any time in Settings · Schedule.

### What happens after a call, on its own
- **Promise captured.** If the party gives a payment date, it is stored as a
  Promise to Pay and shown on the customer page and in reports.
- **Callback scheduled.** "Call me later" moves to the next calling slot, "call
  me tomorrow" to tomorrow's noon slot, "in an hour" is honoured exactly, and a
  specific date and time is honoured as given. Requests beyond 15 days are
  treated as brush-offs and snapped to the next slot. The Dashboard shows
  "Next call" for these.
- **Statement sent.** If the party asks for the bill details on WhatsApp during
  the call, the statement is sent immediately. If their number is not on
  WhatsApp, the request stays open and completes the moment they message you
  from their real WhatsApp number, which is then saved for future sends.
- **Backup number tried.** If the call is not picked up and the party had more
  than one number in the file, the next number is dialled straight away.
- **Sensitive situation.** If the party mentions a death or a medical emergency,
  calling that party is paused for 15 days automatically.

### PDC clearing and cooldown
When your next outstanding upload shows a party's dues have dropped, the
matching pending cheques are marked cleared (oldest first) and that party enters
a **15-day calling and messaging cooldown** so nobody chases money that is
already on its way.

### Who is never contacted automatically

| Group | Calls | WhatsApp |
| --- | --- | --- |
| VIP parties | Never | Never |
| No Follow-up range | Never (not even manually) | Never |
| Cleared / Credit Note | Never | Never |
| In PDC cooldown (15 days) | Blocked | Blocked |
| Sensitive situation (15 days) | Blocked | Blocked |
| No phone number | Skipped | Skipped |

---

## 6. What the AI call actually does

- Speaks **Hindi/Hinglish by default and switches to English** the moment the
  party does. Your business language preference is configurable.
- Knows the real numbers: total due across every open bill, the oldest bill's
  age, how much has already been paid, and the last three conversations with
  that party.
- Uses the script for the party's segment, so the tone escalates as bills age.
- **Transfers to a human** when the party asks for a senior. The transfer number
  is set in Settings, and your team member receives a WhatsApp briefing of the
  party's position as the call rings through.
- Records everything: transcript, recording link, duration, summary,
  disposition, the party's mood, promised date, and the reason a call did not
  connect.

---

## 7. What you can always do by hand

- Call or WhatsApp any single party from Outstandings
- Call or WhatsApp an entire segment, optionally VIP only
- Star or unstar VIPs, individually or by Excel upload
- Fix or add phone numbers inline
- Give one party its own day ranges for calls and WhatsApp
- Mark a cheque cleared or bounced, or add one manually
- Download any of the four PDF reports and any billing invoice
- Turn either automation off instantly, at any time

---

## 8. Billing

| Item | Price | Notes |
| --- | --- | --- |
| 15-day trial | ₹5,000 | Full access, one time, non-refundable, adjusted against onboarding |
| 10-day trial | ₹10,000 | Same, shorter window |
| Onboarding | ₹40,000 (list ₹50,000) | One time, includes your first month, guided setup, coupon can apply |
| Monthly subscription | ₹5,000 per month | Auto-debit on the 1st by UPI Autopay or card mandate |

No GST is added to these prices. Every payment produces a downloadable invoice.

**Bolna** (AI calling) and **AiSensy** (WhatsApp) are your own accounts and you
pay those platforms directly; Praecis only tracks the balances and shows them to
you. Two things pause automated calling: a failed monthly auto-debit, and a
Bolna balance too low to cover the batch. Both are shown as banners on the
Dashboard with what to do about it.

---

## 9. Access and safety

- Each business sees only its own ledger; data is fully separated per tenant.
- Sign-in is by email or Google. Roles: Owner, Manager, Agent.
- Calling and WhatsApp platform keys are held and managed by the PraecisAI team,
  encrypted, and never shown in the dashboard.
- Statement PDFs are stored privately and shared with a time-limited link.
- Turning an automation ON always asks for confirmation; turning it OFF never
  does.

---

## 10. Public website

Alongside the dashboard there is a public site: home, features, how it works,
pricing, industries, case studies, FAQ, about, privacy and terms, plus a live
demo dashboard that prospects can be given access to.

---

## Glossary

| Term | Meaning |
| --- | --- |
| Party | A customer in your ledger |
| Segment | The band a party falls in, which decides how they are contacted |
| Ageing bucket | 0-60, 61-120, 121-180, 181+ days |
| VIP | A starred party, never contacted automatically |
| PDC | Post-dated cheque you are holding |
| PTP | Promise to Pay: a payment date given on a call |
| Disposition | The outcome the AI recorded for a call |
| Cadence | The minimum gap between two automatic WhatsApp messages to one party |
| Cooldown | A pause on contacting one party, after a cleared cheque or a sensitive situation |
