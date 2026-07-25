# Bolna canvas — how the language behaviour actually works

## The model we settled on

**One agent. Hindi/Hinglish primary. It mirrors whatever the customer speaks.**

There is no per-business language setting any more (that toggle was removed
from Settings). The agent always opens in Hindi and switches to English
mid-call, live, when the customer speaks English — and switches back if they
return to Hindi. That decision lives entirely in the **canvas prompt**, not in
the backend.

## What the backend sends (every call, always both languages)

The Hinglish variables are unchanged — the working Hinglish flow was not
touched. English twins ride along so the agent never has to translate an
amount or a script line on the fly:

| Hindi (default)         | English twin                       |
|-------------------------|------------------------------------|
| `due_amount_hindi`      | `due_amount_english`               |
| `segment_instructions`  | `segment_instructions_english`     |
| `days_mention`          | `days_mention_english`             |
| `multi_invoice_note`    | `multi_invoice_note_english`       |
| `partial_payment_note`  | `partial_payment_note_english`     |
| `customer_name`         | `customer_name_english`            |
| `business_city`         | `business_city_english`            |

Built in `backend/src/common/utils/call-script.util.ts`, assembled in
`calling.service.ts`, sent as Bolna `user_data` in
`queues/call.processor.ts`.

Example of the same call in both:
- `due_amount_hindi` → `सवा दो लाख रुपये`
- `due_amount_english` → `approximately two and a half lakh rupees`

## What to do in Bolna

1. **Keep ONE agent**, Hindi as the Primary language.
2. **Keep "English (India)" in the language list.** This is what lets the
   speech-to-text transcribe the customer correctly when they speak English.
   Removing it will make English speech transcribe badly.
3. **Paste `hindi-canvas-english-mode-patch.md` into the Hindi canvas** (one
   new section, right after your `## LANGUAGE` switch block). Nothing else in
   the Hindi canvas changes.
4. **Paste `english-canvas.md` into the English (India) canvas.**

**Bolna DOES swap canvases mid-call** — confirmed on a live test on
2026-07-23: the customer replied in English, Bolna switched to the English
canvas, and because that canvas had no real script Meena improvised
*"How can I assist you today?"* instead of the scripted opening.

So the English canvas must hold the COMPLETE script in English, not a short
English header on top of the Hindi prompt. That is what `english-canvas.md` is.

Both canvases now carry a **"YOU ARE NOT A GENERAL ASSISTANT"** hard rule that
bans "How can I assist you today?" and every variant, in both languages. She
called the customer, so she never asks what they want — if unsure, she says
the next scripted line.

5. Transfer tool stays as configured (see the handoff notes below).

## Transfer / handoff (unchanged)

- Bolna `transfer_call` is a **blind** transfer — no whisper to the human.
- Pre-call webhook URL → `<backend>/api/v1/calling/transfer-context`
- Add `"call_log_id": "%(call_log_id)s"` to the pre-call webhook parameters so
  the backend can match the call reliably.
- The backend then WhatsApps the briefing (party, city, segment, due, last
  promise, reason) to the handoff number via the AiSensy `agent_handoff_v1`
  campaign.
