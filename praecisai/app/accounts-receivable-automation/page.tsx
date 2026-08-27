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
  title: { absolute: 'Accounts Receivable Automation for Indian B2B | PraecisAI' },
  description:
    'Accounts receivable automation for Indian B2B businesses. AI voice calls, WhatsApp reminders, promise tracking and escalation reports replace manual collections follow-up.',
  alternates: { canonical: '/accounts-receivable-automation' },
  openGraph: {
    title: 'Accounts Receivable Automation for Indian B2B | PraecisAI',
    description:
      'Automate accounts receivable follow-up with AI voice calls, WhatsApp reminders and escalation reports. Built for Indian B2B.',
    url: `${SITE_URL}/accounts-receivable-automation`,
    type: 'website',
  },
};

const whatItAutomates = [
  {
    title: 'Reminder calls — every account, every ageing stage',
    body: 'The system calls every account in your outstanding list at the right stage and time, in Hindi or English. No account gets skipped because someone was busy.',
  },
  {
    title: 'WhatsApp follow-ups with ledger statements',
    body: 'Every call triggers a WhatsApp reminder carrying a branded PDF statement. The buyer has the numbers they need to raise an internal payment approval.',
  },
  {
    title: 'Promise-to-pay tracking and callback scheduling',
    body: 'When a buyer commits to a date, AR automation logs it and schedules the next touchpoint automatically — no manual calendar entry, no forgotten follow-up.',
  },
  {
    title: 'Escalation reports to ownership and finance',
    body: 'Accounts past your configured ageing or value threshold surface in weekly reports to the owner and accountant, so high-risk receivables get human attention before they age past recovery.',
  },
];

const benefits = [
  {
    title: 'Reduce DSO without adding staff',
    body: 'Days Sales Outstanding falls when follow-up is consistent and early. AR automation makes the first call at 30 days, not 60, and never skips a promised callback.',
  },
  {
    title: 'Cover the full ledger, not just key accounts',
    body: 'Automated AR follow-up costs the same per account whether you have 50 parties or 5,000. The long tail finally gets the same discipline as your largest accounts.',
  },
  {
    title: 'Free your finance team for higher-value work',
    body: 'When routine reminders, promise chasing and callback scheduling are automated, your accounts team focuses on disputes, reconciliation and cash flow planning.',
  },
  {
    title: 'Full audit trail of every touchpoint',
    body: 'Every call, every response, every promise and every escalation is logged with a timestamp. You can see exactly what happened on any account at any point in the collections cycle.',
  },
];

const stats = [
  { value: 'DSO', label: 'Reduced by consistent early follow-up' },
  { value: '100%', label: 'Ledger coverage — no accounts skipped' },
  { value: 'Full trail', label: 'Every call, response, and promise logged' },
];

const faqs = [
  {
    question: 'What is accounts receivable automation?',
    answer:
      'Accounts receivable (AR) automation replaces manual follow-up tasks in the collections cycle — reminder calls, WhatsApp messages, statement delivery, promise tracking and escalation reports — with software that runs the same workflow automatically, across every account in your outstanding list, on the schedule you configure.',
  },
  {
    question: 'How does AR automation reduce DSO?',
    answer:
      'DSO falls when follow-up is consistent, early and without gaps. AR automation makes the first reminder call at the exact day you configure (often 30 days), follows up on every promised payment date, and escalates risk accounts before they age further — all without waiting for a human to find the time.',
  },
  {
    question: 'Does this replace our accountant or collections team?',
    answer:
      'No. AR automation handles the high-volume, repetitive touchpoints — routine reminders and promise chasing — so your team can focus on disputes, relationship management and the escalations that genuinely require a human.',
  },
  {
    question: 'What is the difference between AR automation and a collections agency?',
    answer:
      'A collections agency takes over your overdue accounts, typically for a percentage of recovered debt, and your relationship with the buyer is usually damaged. AR automation is a tool your team uses to follow up proactively, before debt becomes overdue, while preserving the buyer relationship.',
  },
  {
    question: 'Can we customise the follow-up cadence?',
    answer:
      'Yes. You configure the day-ranges for each ageing stage, the grace periods, the call windows, and which accounts are excluded from automated contact. The workflow runs to your rules, not a fixed template.',
  },
  {
    question: 'What does AR automation cost?',
    answer:
      'PraecisAI is priced at ₹5,000 per month, published openly with no lock-in. Full pricing details are at praecisai.in/pricing.',
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

export default function AccountsReceivableAutomationPage() {
  return (
    <MarketingPage
      crumbs={[{ label: 'Accounts Receivable Automation', href: '/accounts-receivable-automation' }]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="Accounts Receivable Automation"
        title="Accounts Receivable Automation for Indian B2B Businesses"
        lead="PraecisAI automates the accounts receivable follow-up cycle for Indian B2B businesses: AI voice calls in Hindi and English, WhatsApp reminders with branded statements, promise-to-pay tracking, and escalation reports — so your finance team manages exceptions, not reminders."
      />

      <Section tone="cream">
        <StatStrip stats={stats} />
      </Section>

      <Section
        tone="warm"
        title="What accounts receivable automation handles"
        intro="The repetitive, high-volume tasks in the AR cycle that consume most of your team's time."
      >
        <CardGrid items={whatItAutomates} />
      </Section>

      <Section
        tone="cream"
        title="What AR automation delivers for your business"
        intro="The measurable outcomes when the full receivables follow-up cycle runs automatically."
      >
        <CardGrid items={benefits} />
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
              description: 'The AI that powers the automated AR follow-up cycle.',
            },
            {
              label: 'Payment Recovery Software',
              href: '/payment-recovery-software',
              description: 'How PraecisAI fits into the broader payment recovery landscape.',
            },
            {
              label: 'Features',
              href: '/features',
              description: 'Full list of capabilities: calls, WhatsApp, statements, reports.',
            },
            {
              label: 'Glossary',
              href: '/glossary',
              description: 'Definitions of DSO, AR, promise-to-pay and other key terms.',
            },
          ]}
        />
      </Section>

      <CtaBand
        heading="See AR automation working on a real ledger"
        body="Open the live demo and watch the full accounts receivable follow-up cycle run automatically — call, WhatsApp, statement."
      />
    </MarketingPage>
  );
}
