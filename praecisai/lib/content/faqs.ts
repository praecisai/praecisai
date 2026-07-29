/**
 * Single source of truth for the FAQ content shown on the homepage accordion
 * and the standalone /faq page (and reused for FAQPage schema on both).
 */

export type Faq = { question: string; answer: string };

/** Shown on the homepage accordion. */
export const coreFaqs: Faq[] = [
  {
    question: 'Does it work with any Excel format?',
    answer:
      'Yes. Whatever columns you already track: Bill No., Party Name, Due Amount, Days Overdue. PraecisAI auto-maps them, so no reformatting is needed.',
  },
  {
    question: 'Can PraecisAI connect to Tally, Zoho, or SAP instead?',
    answer:
      'Yes. Our team works with your technical person to integrate directly with your existing accounting, ERP, or billing software, so your outstanding data syncs automatically with no daily manual upload.',
  },
  {
    question: "Will my customers know it's automated?",
    answer:
      "PraecisAI's voice calls are natural, conversational Hindi and English, not robotic playback. Every message is personalised with the party name, bill number, and due amount. Most customers respond to it the same way they would a human collections call.",
  },
  {
    question: 'What if a customer disputes the amount?',
    answer:
      'PraecisAI can transfer the call live to your accountant or team, with an instant WhatsApp alert giving them full context, so disputes are never left unresolved.',
  },
  {
    question: 'Does it remember what a customer said on earlier calls?',
    answer:
      'Yes. Every call carries the full history and summary of previous conversations, so a customer never repeats themselves and no promise gets lost between calls.',
  },
  {
    question: 'Is our data secure?',
    answer:
      'Yes. Your outstanding data is bank-grade secure, encrypted in transit and at rest, never shared with any third party, and never leaves India.',
  },
  {
    question: 'How long does setup take?',
    answer:
      'Most businesses are live within 10 minutes for manual upload. Software integrations such as Tally, Zoho, or SAP typically take a few days depending on your existing system.',
  },
  {
    question: 'Can I set custom follow-up rules?',
    answer:
      'Yes. Stage day-ranges, grace periods per stage, call timing, and WhatsApp cadence are all configurable to your business.',
  },
  {
    question: 'What languages are supported?',
    answer: 'Hindi and English currently, with more Indian languages planned.',
  },
  {
    question: 'Is there a contract?',
    answer:
      'No lock-in. ₹5,000 per month platform fee, cancel anytime, plus a one-time ₹50,000 setup fee.',
  },
];

/** Extra groups shown only on the standalone /faq page. */
export const faqGroups: { heading: string; faqs: Faq[] }[] = [
  { heading: 'Getting started', faqs: coreFaqs.slice(0, 3) },
  { heading: 'Calls, messages and disputes', faqs: coreFaqs.slice(3, 5) },
  {
    heading: 'Security and data',
    faqs: [
      coreFaqs[5],
      {
        question: 'Where is our data hosted?',
        answer:
          'Your outstanding data stays within India. It is encrypted in transit and at rest, and is never shared with any third party.',
      },
      {
        question: 'Who inside our business can see the data?',
        answer:
          'Access is scoped to your business only. Owners and team members see their own tenant data, and reports are delivered to the recipients you nominate.',
      },
    ],
  },
  { heading: 'Setup and configuration', faqs: coreFaqs.slice(6, 9) },
  {
    heading: 'Pricing and contracts',
    faqs: [
      coreFaqs[9],
      {
        question: 'What exactly does the ₹5,000 per month cover?',
        answer:
          'Unlimited debtor parties, four-stage AI segmentation, branded PDF statements, the promise-to-pay tracker, the live recovery dashboard, all five weekly reports, and onboarding support. WhatsApp messaging and AI voice calls are billed separately on usage.',
      },
      {
        question: 'Does the price go up as we add more parties?',
        answer:
          'No. The platform fee covers unlimited parties. Only usage-based messaging and calling scale with volume.',
      },
    ],
  },
];

/** Flat, de-duplicated list used for the /faq page's FAQPage schema. */
export const allFaqs: Faq[] = Array.from(
  new Map(faqGroups.flatMap((group) => group.faqs).map((faq) => [faq.question, faq])).values(),
);
