import type { Metadata } from 'next';
import MarketingPage, { SITE_URL, OG_IMAGES } from '../components/marketing/MarketingPage';
import {
  PageHero,
  Section,
  CardGrid,
  StatStrip,
  FaqList,
  CtaBand,
  RelatedLinks,
} from '../components/marketing/blocks';

export const metadata: Metadata = {
  title: { absolute: 'AI Collections Agent for B2B Businesses India | PraecisAI' },
  description:
    'An AI collections agent that automates the full receivables follow-up cycle — AI voice calls, WhatsApp reminders, branded statements and promise-to-pay tracking. Built for Indian B2B.',
  alternates: { canonical: '/ai-collections-agent' },
  openGraph: {
    title: 'AI Collections Agent for B2B Businesses India | PraecisAI',
    description:
      'Automate the full receivables follow-up cycle — AI voice calls, WhatsApp reminders, branded statements and promise-to-pay tracking.',
    url: `${SITE_URL}/ai-collections-agent`,
    type: 'website',
    images: OG_IMAGES,
  },
};

const capabilities = [
  {
    title: 'AI voice calls in Hindi and English',
    body: 'The collections agent calls each debtor in their preferred language, delivers a configurable script matched to the ageing stage, and listens to the response — adapting in real time like a trained caller.',
  },
  {
    title: 'WhatsApp reminders with branded statements',
    body: 'Every call is followed by a WhatsApp message carrying a PDF ledger statement. The buyer sees exactly which bills are open, which removes the most common reason payments are delayed.',
  },
  {
    title: 'Promise-to-pay tracking and callback',
    body: 'When a debtor commits to a payment date, the AI logs it and calls back on exactly that date — or after the grace period you configure — without any manual follow-up needed.',
  },
  {
    title: 'Live transfer and escalation reports',
    body: 'Disputes and high-value escalations are transferred live to your team with a WhatsApp briefing. Accounts past your ageing threshold surface in weekly reports to the owner.',
  },
];

const painPoints = [
  {
    title: 'Outstanding ages because nobody has time to call',
    body: 'Every day a bill sits unpaid is a day your working capital is funding someone else\'s business. The follow-up that does not happen today makes collection harder tomorrow.',
  },
  {
    title: 'Collections is not a one-call job',
    body: 'Most B2B debts require four to seven contacts before payment. A human team cannot sustain that cadence across hundreds of accounts without dropping threads.',
  },
  {
    title: 'Inconsistent tone damages relationships',
    body: 'Too aggressive and you lose the account. Too soft and the debtor deprioritises you. The right tone changes with the ageing stage — and human callers do not always get it right.',
  },
  {
    title: 'No visibility into what was promised',
    body: 'When a debtor says "next week" and nobody logs it, the promise evaporates. When a different person calls the next week, the story starts from scratch.',
  },
];

const stats = [
  { value: 'Full cycle', label: 'Calls, WhatsApp, statements, escalation' },
  { value: '4–7×', label: 'Typical contacts needed before payment' },
  { value: '₹5,000/mo', label: 'Flat platform fee, no per-call lock-in' },
];

const faqs = [
  {
    question: 'What is an AI collections agent?',
    answer:
      'An AI collections agent is software that automates the accounts receivable follow-up process: it makes voice calls to debtors, sends WhatsApp reminders, delivers branded ledger statements, tracks promises-to-pay, and escalates disputes to your team — all without manual intervention per account.',
  },
  {
    question: 'How is an AI collections agent different from collections software?',
    answer:
      'Traditional collections software sends automated SMS or email reminders. An AI collections agent actually has a voice conversation with the debtor — it listens, responds to questions, handles objections, logs a commitment, and follows up on the exact promised date.',
  },
  {
    question: 'Does the AI collections agent replace my accounts team?',
    answer:
      'No — it handles the routine, repetitive follow-up so your accounts team can focus on disputes, relationships and escalations that genuinely need a human. Think of it as the team\'s first point of contact on every account, every week.',
  },
  {
    question: 'What data does the AI need to start working?',
    answer:
      'An outstanding ledger in Excel or CSV format (or a Tally export) with party name, contact number, invoice details and amounts. That is enough to go live in 10 minutes.',
  },
  {
    question: 'How does the AI handle a debtor who is angry or abusive?',
    answer:
      'The AI is configured to disengage gracefully from hostile conversations and flag the account for human follow-up, with a full transcript of what was said.',
  },
  {
    question: 'Is the data secure?',
    answer:
      'Yes. All data is stored on Indian servers, encrypted in transit and at rest, and never shared with third parties. PraecisAI does not use your ledger data for any purpose other than running your configured collections workflow.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

export default function AiCollectionsAgentPage() {
  return (
    <MarketingPage crumbs={[{ label: 'AI Collections Agent', href: '/ai-collections-agent' }]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="AI Collections Agent"
        title="AI Collections Agent for B2B Payment Recovery in India"
        lead="PraecisAI is an AI collections agent that automates the full accounts receivable follow-up cycle: voice calls in Hindi and English, WhatsApp reminders with branded ledger statements, promise-to-pay tracking, and live escalation to your team — all from a single platform."
      />

      <Section tone="cream">
        <StatStrip stats={stats} />
      </Section>

      <Section
        tone="warm"
        title="Why B2B collections breaks down without automation"
        intro="The root cause is not effort — it is capacity. Here is where the manual process falls apart."
      >
        <CardGrid items={painPoints} />
      </Section>

      <Section
        tone="cream"
        title="What the AI collections agent does"
        intro="Four capabilities that cover the full receivables cycle from first reminder to recovered cash."
      >
        <CardGrid items={capabilities} />
      </Section>

      <Section tone="warm" title="Frequently asked questions">
        <FaqList faqs={faqs} />
      </Section>

      <Section tone="cream" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: 'AI Calling Agent',
              href: '/ai-calling-agent',
              description: 'How the AI voice call component works in detail.',
            },
            {
              label: 'Payment Recovery Software',
              href: '/payment-recovery-software',
              description: 'How PraecisAI compares to traditional payment recovery tools.',
            },
            {
              label: 'Accounts Receivable Automation',
              href: '/accounts-receivable-automation',
              description: 'End-to-end AR automation for Indian B2B businesses.',
            },
            {
              label: 'Pricing',
              href: '/pricing',
              description: '₹5,000 per month — published openly, no sales call needed.',
            },
          ]}
        />
      </Section>

      <CtaBand
        heading="See the AI collections agent working on a live ledger"
        body="Open the demo dashboard and watch a real collections workflow — AI call, WhatsApp reminder, branded statement — run automatically."
      />
    </MarketingPage>
  );
}
