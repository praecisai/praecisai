# PraecisAI: tech flows for pitching

Copy-paste Mermaid for decks, docs and investor/customer conversations. Every
diagram matches what the code actually does. Renders in GitHub, Notion,
Obsidian, mermaid.live and most slide tools.

Contents: [architecture](#1-system-architecture--tech-stack) ·
[product flow](#2-end-to-end-product-flow) ·
[AI call](#3-ai-call-lifecycle) ·
[WhatsApp](#4-whatsapp-statement-flow-with-retry-ladder) ·
[guardrails](#5-contact-guardrails-the-can-we-call-this-party-gate) ·
[segments](#6-segment-state-machine) ·
[PDC](#7-pdc-cheque-lifecycle) ·
[queues](#8-queue-and-scheduler-topology) ·
[billing](#9-billing-and-entitlement-flow) ·
[data model](#10-data-model) ·
[what we tackle](#11-what-we-tackle-and-how)

---

## 1. System architecture / tech stack

```mermaid
flowchart TB
    subgraph users["People"]
        OWNER["Business owner and accounts team<br/>desktop or mobile browser"]
        PARTY["Party being recovered from<br/>phone call and WhatsApp"]
    end

    subgraph fe["Frontend · Vercel"]
        NEXT["Next.js 16 · React 19<br/>App Router, Tailwind v4, GSAP"]
        RQ["TanStack Query<br/>cache and optimistic updates"]
        AUTHC["Supabase Auth client<br/>email or Google sign-in"]
    end

    subgraph be["Backend · Railway"]
        API["NestJS 11 REST API<br/>JWT guard, tenant scoping, Swagger"]
        DOM["Domain services<br/>import · segmentation · calling · whatsapp<br/>pdc · reports · billing"]
        WORK["BullMQ workers<br/>6 queues, 3 hourly cron schedulers"]
    end

    subgraph data["Data · Supabase"]
        PG[("PostgreSQL<br/>Prisma ORM, per-business rows")]
        BUCK[("Private storage<br/>import files, statement PDFs")]
    end

    REDIS[("Redis<br/>job queues, repeat schedules,<br/>worker-wide rate limits")]

    subgraph ext["External platforms"]
        BOLNA["Bolna<br/>AI voice agent and telephony"]
        LLM["OpenAI GPT-4.1<br/>transcript extraction"]
        AISENSY["AiSensy → WhatsApp Cloud API"]
        RZP["Razorpay<br/>mandates, autopay, webhooks"]
    end

    OWNER --> NEXT
    NEXT --> RQ --> API
    NEXT --> AUTHC --> PG
    API --> DOM --> PG
    DOM --> BUCK
    DOM --> WORK
    WORK <--> REDIS
    WORK --> BOLNA
    WORK --> AISENSY
    BOLNA -.->|"call ended webhook"| API
    API --> LLM
    AISENSY -.->|"inbound reply webhook"| API
    RZP -.->|"payment webhooks"| API
    DOM --> RZP
    BOLNA --> PARTY
    AISENSY --> PARTY
```

---

## 2. End-to-end product flow

```mermaid
flowchart LR
    A["Tally or Excel<br/>outstanding export"] --> B["Import Center<br/>drop the file"]
    B --> C["Fuzzy column detection<br/>party, bill no, date, due, mobile, agent"]
    C --> D["Parties and bills upserted<br/>cities parsed out of names"]
    D --> E["Ageing and segmentation<br/>oldest bill drives the segment"]

    E --> F{"Contact channel"}
    F -->|"voice"| G["AI recovery call<br/>Hindi or English"]
    F -->|"chat"| H["WhatsApp statement PDF<br/>branded, segment coloured"]

    G --> I["Transcript to structured outcome<br/>summary, disposition, mood, promise"]
    H --> J["Delivery status and retries"]

    I --> K["Promise to Pay recorded"]
    I --> L["Callback auto-scheduled"]
    I --> M["Statement auto-sent if asked on call"]
    I --> N["Human transfer with WhatsApp briefing"]

    K --> O["Reports<br/>positive · negative · escalation · segments"]
    J --> O
    O --> P["Next outstanding upload"]
    P --> Q["Paid bills close · cheques clear<br/>cooldowns applied · segments recalculated"]
    Q --> E
```

---

## 3. AI call lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant S as Scheduler or user click
    participant API as NestJS API
    participant G as Guardrails
    participant Q as BullMQ outbound-calls
    participant B as Bolna voice agent
    participant C as Party
    participant X as GPT-4.1 extraction
    participant DB as PostgreSQL

    S->>API: queue call for party
    API->>G: VIP, No Follow-up, cooldowns, phone present
    G-->>API: allowed
    API->>DB: build context - total due, oldest bill,<br/>part payment, last 3 conversations
    API->>Q: enqueue with full script context
    Note over Q: paced 1 dial every 5 seconds<br/>so the caller ID is never flagged
    Q->>B: dispatch call on the tenant's own account
    B->>C: speaks Hindi or Hinglish, mirrors English
    C-->>B: response
    alt asks for a senior
        B->>API: pre-transfer webhook
        API->>C: human agent joins, briefing sent on WhatsApp
    end
    B-->>API: call ended, transcript and recording
    API->>X: extract structured outcome
    X-->>API: disposition, mood, sensitivity,<br/>callback intent, promise intent
    Note over API: dates computed in code from intent,<br/>never trusted from the model
    API->>DB: call log, promise to pay, cooldowns, next call slot
    opt not picked up
        API->>Q: dial the party's backup number
    end
```

---

## 4. WhatsApp statement flow with retry ladder

```mermaid
sequenceDiagram
    autonumber
    participant CR as Hourly scheduler
    participant P as auto-whatsapp worker
    participant DB as PostgreSQL
    participant W as whatsapp-statements worker
    participant ST as Supabase storage
    participant A as AiSensy
    participant C as Party

    CR->>P: does this hour match the tenant's slot
    P->>DB: eligible parties by segment
    Note over P: cadence 15 days for Soft Reminder, 7 for others<br/>one message per handset, daily ceiling per tenant
    P->>W: enqueue sends
    Note over W: paced 1 message every 2 seconds
    W->>DB: open bills for the party
    W->>ST: generate and upload statement PDF
    ST-->>W: private time-limited link
    W->>A: template send with PDF
    A->>C: WhatsApp message
    alt provider failure
        A-->>W: rejection reason
        W->>DB: log FAILED with the real reason
        W->>W: retry in 3.5 hours, then next day same time
        Note over W: after 3 attempts it stops and<br/>waits for the next cadence run
    else delivered
        W->>DB: log SENT
    end
    C-->>A: replies on WhatsApp
    A-->>W: inbound webhook, statement resent to the working number
```

---

## 5. Contact guardrails: the "can we call this party" gate

```mermaid
flowchart TD
    START["Contact requested<br/>automatic run or manual click"] --> VIP{"VIP party"}
    VIP -->|"yes, automatic"| STOP1["Blocked<br/>VIPs are manual-only by design"]
    VIP -->|"no"| SEG{"Segment"}
    SEG -->|"No Follow-up, Cleared, Credit Note"| STOP2["Blocked<br/>inside credit period or nothing due"]
    SEG -->|"contactable"| PDC{"Cheque cooldown active"}
    PDC -->|"yes"| STOP3["Blocked for 15 days<br/>payment already on its way"]
    PDC -->|"no"| SENS{"Sensitive situation flagged"}
    SENS -->|"yes"| STOP4["Blocked for 15 days<br/>death or medical emergency"]
    SENS -->|"no"| PHONE{"Phone number on file"}
    PHONE -->|"no"| STOP5["Skipped<br/>surfaced for inline fixing"]
    PHONE -->|"yes"| REPEAT{"Called or messaged too recently"}
    REPEAT -->|"yes"| STOP6["Blocked<br/>anti double-dial and cadence"]
    REPEAT -->|"no"| BAL{"Balance and mandate healthy"}
    BAL -->|"no"| STOP7["Paused<br/>banner explains what to fix"]
    BAL -->|"yes"| GO["Contact dispatched"]
```

---

## 6. Segment state machine

```mermaid
stateDiagram-v2
    direction LR
    [*] --> NoFollowUp: bill imported

    state "No Follow-up · 0 days<br/>no contact at all" as NoFollowUp
    state "Soft Reminder · 1-60<br/>gentle nudge" as Soft
    state "Follow-up · 61-120<br/>ask for a date" as Follow
    state "Strong Follow-up · 121-180<br/>accounts team firmness" as Strong
    state "Escalation · 181+<br/>senior team, urgent" as Esc
    state "Cleared<br/>nothing due" as Cleared
    state "Cooldown<br/>cheque cleared or sensitive" as Cool

    NoFollowUp --> Soft: ages past credit period
    Soft --> Follow: ages on
    Follow --> Strong: ages on
    Strong --> Esc: ages on

    Soft --> Cleared: payment lands in next import
    Follow --> Cleared: payment lands
    Strong --> Cleared: payment lands
    Esc --> Cleared: payment lands

    Soft --> Cool: cheque cleared or sensitive call
    Follow --> Cool
    Strong --> Cool
    Esc --> Cool
    Cool --> Soft: 15 days pass, re-segmented
    Cleared --> [*]

    note right of Esc
        Day ranges are per business,
        with a separate set for WhatsApp
        and per-party overrides.
    end note
```

---

## 7. PDC cheque lifecycle

```mermaid
flowchart LR
    UP["Cheque register uploaded<br/>or single cheque added"] --> DEDUP{"Already on record<br/>party + number + amount"}
    DEDUP -->|"yes"| SKIP["Skipped<br/>re-upload is safe"]
    DEDUP -->|"no"| MATCH["Fuzzy-matched to a party"]
    MATCH --> PEND["Pending"]

    PEND --> REM["2 days before cheque date<br/>WhatsApp reminder to fund the account"]
    REM --> PEND

    PEND --> DROP{"Next import shows dues dropped"}
    DROP -->|"yes"| CLR["Auto-cleared, oldest first"]
    DROP -->|"no"| MAN{"Marked by hand"}
    MAN -->|"cleared"| CLR
    MAN -->|"bounced"| BNC["Bounced<br/>party returns to normal chasing"]

    CLR --> COOL["15-day cooldown<br/>no calls, no statements"]
    COOL --> BACK["Chasing resumes if still unpaid"]
```

---

## 8. Queue and scheduler topology

```mermaid
flowchart TB
    subgraph cron["Hourly cron in Redis, 08:00-20:00 IST"]
        C1["auto-calls"]
        C2["auto-whatsapp"]
        C3["pdc-reminders"]
    end

    subgraph work["Workers"]
        W1["outbound-calls<br/>1 dial / 5s"]
        W2["callback-redials<br/>delayed jobs"]
        W3["whatsapp-statements<br/>1 send / 2s + retry ladder"]
        W4["bolna-usage<br/>balance poll every 30 min"]
    end

    C1 -->|"tenants whose hour, weekday and month match"| W1
    C2 -->|"cadence, dedupe, daily ceiling"| W3
    C3 -->|"cheques due in 2 days, first WhatsApp slot"| W3
    W1 -->|"customer asked to be rung back"| W2
    W2 --> W1
    W4 --> ALERT["Low-balance and halted-mandate banners"]

    NOTE["Redis holds the schedule, so every run fires once<br/>even with several API instances live"]
```

---

## 9. Billing and entitlement flow

```mermaid
flowchart TD
    SU["Sign up"] --> GATE{"Entitlement check"}
    GATE -->|"none"| PLANS["Plans screen<br/>no dashboard chrome"]
    PLANS --> T15["15-day trial · ₹5,000"]
    PLANS --> T10["10-day trial · ₹10,000"]
    PLANS --> ONB["Onboarding · ₹40,000<br/>includes first month"]

    T15 --> RZP["Razorpay checkout"]
    T10 --> RZP
    ONB --> RZP
    RZP -->|"signature verified server-side"| OPEN["Dashboard unlocked"]
    RZP -.->|"webhook: payment.captured"| INV["Invoice PDF generated"]

    OPEN --> MAND["UPI Autopay or card mandate"]
    MAND --> MONTH["₹5,000 auto-debit on the 1st"]
    MONTH -.->|"subscription.charged"| INV
    MONTH -.->|"subscription.halted"| PAUSE["Automated calling paused<br/>banner with the fix"]
    PAUSE -->|"payment resolved"| MONTH

    OPEN --> TRIALEND{"Trial window over"}
    TRIALEND -->|"yes"| PLANS
    TRIALEND -->|"continues"| CREDIT["Trial amount adjusted<br/>against onboarding"]
```

---

## 10. Data model

```mermaid
erDiagram
    BUSINESS ||--o{ USER : "signs in"
    BUSINESS ||--o{ CUSTOMER : owns
    CUSTOMER ||--o{ INVOICE : "has bills"
    CUSTOMER ||--|| OUTSTANDING : "rolls up to"
    CUSTOMER ||--o{ CALL_LOG : "was called"
    CUSTOMER ||--o{ WHATSAPP_LOG : "was messaged"
    CUSTOMER ||--o{ PROMISE_TO_PAY : promised
    CUSTOMER ||--o{ PDC_CHEQUE : "handed cheques"
    BUSINESS ||--o{ IMPORT_HISTORY : uploaded
    BUSINESS ||--o{ PDC_UPLOAD : uploaded
    BUSINESS ||--|| BILLING_SUBSCRIPTION : "pays via"
    BILLING_SUBSCRIPTION ||--o{ BILLING_INVOICE : issues

    BUSINESS {
        json segment_rules "day ranges per segment"
        json whatsapp_segment_rules "separate WhatsApp ranges"
        json vip_rule "VIP-only override"
        bool auto_calls_enabled
        bool auto_whatsapp_enabled
        int_array auto_call_hours "and weekdays, months"
        int_array auto_whatsapp_hours "and weekdays, months"
        bool pdc_reminder_enabled
        string encrypted_platform_keys "AES-256-GCM"
    }
    CUSTOMER {
        string phone
        string_array alt_phones "backup numbers"
        bool is_vip "never auto-contacted"
        json custom_schedule "per-party ranges"
    }
    OUTSTANDING {
        float total_due
        string segment
        string whatsapp_segment
        date pdc_cooldown_until
    }
    CALL_LOG {
        string disposition
        string call_summary
        date promise_date
        bool is_sensitive
        date next_call_at
        string recording_url
    }
    PDC_CHEQUE {
        string cheque_no
        date cheque_date
        string status
        date reminder_sent_at
    }
```

---

## 11. What we tackle, and how

```mermaid
flowchart LR
    subgraph P["The hard parts"]
        P1["Tally exports are messy<br/>and differ per business"]
        P2["Telecom flags burst dialers"]
        P3["Meta downgrades spammy senders"]
        P4["LLMs miscompute dates"]
        P5["Chasing people who already paid"]
        P6["Big clients must not be robo-called"]
        P7["Human moments on a debt call"]
        P8["Money and keys per tenant"]
    end

    subgraph S["How PraecisAI handles it"]
        S1["Fuzzy column detection with aliases,<br/>city parsed from party names,<br/>re-upload closes paid bills automatically"]
        S2["One dial every 5 seconds, worker-wide,<br/>inside two daily windows"]
        S3["Per-segment cadence, one message per handset,<br/>daily ceiling, 3-step retry ladder"]
        S4["The model returns intent only;<br/>dates are computed in code against IST today"]
        S5["Cheque clearing detected from the next import,<br/>15-day cooldown across both channels"]
        S6["VIP flag blocks every automation;<br/>reaching them is always a deliberate click"]
        S7["Death or illness detected in Hindi and English,<br/>calling paused 15 days, senior transfer on request"]
        S8["Per-tenant encrypted platform keys,<br/>balance gate before every batch,<br/>every row scoped to one business"]
    end

    P1 --> S1
    P2 --> S2
    P3 --> S3
    P4 --> S4
    P5 --> S5
    P6 --> S6
    P7 --> S7
    P8 --> S8
```

### The same points in one line each

| Problem | Our approach |
| --- | --- |
| Every business exports a different Excel | Column aliases plus fuzzy matching: no mapping screen, clear errors when a required column is genuinely missing |
| Imports are cumulative and get re-uploaded | Each upload is the new truth: bills added, dues updated, missing bills marked paid, duplicate cheques skipped |
| Indian operators flag dense dialing | One call every 5 seconds worker-wide, inside the tenant's own two daily windows, on the tenant's own caller ID |
| WhatsApp quality ratings are fragile | 15-day and 7-day cadences, one message per physical handset, a daily ceiling, and a retry ladder that gives up rather than hammering |
| LLM date arithmetic is unreliable | The model extracts intent, code computes the calendar date from IST today; promises and callbacks are deterministic |
| Recovery calls hit real human situations | Death and illness are detected in Hindi and English phrasing and pause that party for 15 days; a senior transfer sends the human a WhatsApp briefing first |
| Nobody should chase settled money | Cleared cheques are detected from the next import and trigger a 15-day cooldown on both channels |
| Key accounts need human handling | VIP parties are excluded from every automated path; contacting them is always an explicit action |
| Multi-tenant money and credentials | Platform keys are AES-256-GCM encrypted per tenant, never returned to the browser; a balance and mandate gate runs before every batch |
| Long-running imports and bulk sends | Everything heavy runs as a background job in Redis-backed queues, so no request times out and a redeploy resumes cleanly |
