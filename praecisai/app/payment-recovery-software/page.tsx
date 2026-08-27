import type { Metadata } from 'next';
import MarketingPage, { SITE_URL } from '../components/marketing/MarketingPage';
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
  title: { absolute: 'Payment Recovery Software for Indian B2B | PraecisAI' },
  description:
    'Payment recovery software that uses AI voice calls and WhatsApp to recover B2B outstanding in India. Automated follow-up, promise tracking and escalation reports.',
  alternates: { canonical: '/payment-recovery-software' },
  openGraph: {
    title: 'Payment Recovery Software for Indian B2B | PraecisAI',
    description:
      'Payment recovery software using AI voice calls and WhatsApp to recover B2B outstanding in India.',
    url: `${SITE_URL}/payment-recovery-software`,
    type: 'website',
  },
};

const features = [
  {
    title: 'AI voice calls — not SMS, not email',
    body: 'Most payment recovery software sends automated SMS or email. PraecisAI makes actual phone calls in Hindi and English, which get answered and acted on at a far higher rate than a text message.',
  },
  {
    title: 'WhatsApp reminders with PDF ledger statements',
    body: 'Every call is followed by a WhatsApp message with a branded PDF statement listing exactly which bills are open. Buyers cannot claim they did not know what they owed.',
  },
  {
    title: 'Promise-to-pay tracking built in',
    body: 'When a buyer promises a date, the software logs it and calls back exactly then. No spreadsheet, no manual reminder, no forgotten follow-up.',
  },
  {
    title: 'Configurable escalation for each stage',
    body: 'Set the day-ranges and tone for each of four escalation stages. Soft at 30 days, firm at 90, escalated to owner report at 120. The software runs the ladder automatically.',
  },
];

const vsOld = [
  {
    title: 'No per-account manual work',
    body: 'Traditional payment recovery software requires someone to trigger each campaign. PraecisAI runs the follow-up automatically from the moment data is uploaded.',
  },
  {
    title: 'Covers the long tail, not just the big accounts',
    body: 'A small account that owes ₹8,000 gets the same disciplined follow-up as a large account that owes ₹8 lakh. AI cost does not scale with ticket size.',
  },
  {
    title: 'Data stays in India',
    body: 'All ledger data is stored on Indian servers, encrypted, and never shared with third parties. Built for Indian MSME compliance from day one.',
  },
  {
    title: 'Live in 10 minutes, not 10 weeks',
    body: 'Upload your outstanding in Excel or CSV and configure your stages. The software is running in under 10 minutes with no IT project required.',
  },
];

const stats = [
  { value: 'Excel / Tally', label: 'Data sources supported on day one' },
  { value: '10 minutes', label: 'Time to first automated call' },
  { value: 'India servers', label: 'Data sovereignty, always' },
];

const faqs = [
  {
    question: 'What is payment recovery software?',
    answer:
      'Payment recovery software automates the process of following up on unpaid B2B invoices. At its most basic, it sends automated reminders. At its most advanced (like PraecisAI), it makes AI voice calls, sends WhatsApp messages, tracks promises-to-pay, and escalates high-risk accounts to your team — all without manual intervention per account.',
  },
  {
    question: 'How is PraecisAI different from other payment recovery software?',
    answer:
      'Most payment recovery tools send automated SMS or email. PraecisAI makes AI voice calls — in Hindi and English — which get answered and acted on at a significantly higher rate. The combination of voice, WhatsApp and branded statements closes the loop that text-only tools leave open.',
  },
  {
    question: 'Does the software work for any industry?',
    answer:
      'Yes. PraecisAI is configured around your ageing buckets, escalation stages and call timings — not a fixed industry template. It is used by textile distributors, pharma stockists, hardware dealers, manufacturers and wholesalers.',
  },
  {
    question: 'What file formats does it accept?',
    answer:
      'Excel (.xlsx), CSV and Tally outstanding exports are supported on day one. Direct ERP integration (Tally, SAP Business One, Busy) is available for teams that want automatic data sync.',
  },
  {
    question: 'Is there a minimum contract or lock-in period?',
    answer:
      'No lock-in. PraecisAI is priced at ₹5,000 per month with no minimum contract. You can see the full pricing at praecisai.in/pricing.',
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

export default function PaymentRecoverySoftwarePage() {
  return (
    <MarketingPage crumbs={[{ label: 'Payment Recovery Software', href: '/payment-recovery-software' }]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="Payment Recovery Software"
        title="Payment Recovery Software That Actually Calls Your Debtors"
        lead="PraecisAI is payment recovery software for Indian B2B businesses. Instead of sending automated SMS that get ignored, it makes AI voice calls in Hindi and English, sends WhatsApp reminders with branded statements, tracks payment promises, and escalates risk accounts to your team — automatically, from the moment your ledger data is uploaded."
      />

      <Section tone="cream">
        <StatStrip stats={stats} />
      </Section>

      <Section
        tone="warm"
        title="What makes this payment recovery software different"
        intro="Most tools stop at sending a reminder. Here is what PraecisAI does instead."
      >
        <CardGrid items={features} />
      </Section>

      <Section
        tone="cream"
        title="Why teams switch from traditional approaches"
        intro="Common reasons B2B businesses upgrade their payment recovery workflow to PraecisAI."
      >
        <CardGrid items={vsOld} />
      </Section>

      <Section tone="warm" title="Frequently asked questions">
        <FaqList faqs={faqs} />
      </Section>

      <Section tone="cream" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: 'AI Collections Agent',
              href: '/ai-collections-agent',
              description: 'The full collections workflow — calls, WhatsApp, statements, escalation.',
            },
            {
              label: 'Accounts Receivable Automation',
              href: '/accounts-receivable-automation',
              description: 'End-to-end AR automation for Indian B2B.',
            },
            {
              label: 'AI Payment Recovery vs Manual Follow-up',
              href: '/compare/ai-payment-recovery-vs-manual-followup',
              description: 'Side-by-side comparison of automated and manual collection approaches.',
            },
            {
              label: 'Pricing',
              href: '/pricing',
              description: '₹5,000 per month — published openly, no lock-in.',
            },
          ]}
        />
      </Section>

      <CtaBand
        heading="See the payment recovery software working live"
        body="Open the demo dashboard and watch an AI call, WhatsApp reminder and branded statement go out on a real ledger."
      />
    </MarketingPage>
  );
}
