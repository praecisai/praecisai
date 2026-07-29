import type { Metadata } from 'next';
import MarketingPage from '../components/marketing/MarketingPage';
import {
  PageHero,
  Section,
  CardGrid,
  FaqList,
  CtaBand,
  RelatedLinks,
} from '../components/marketing/blocks';

export const metadata: Metadata = {
  title: { absolute: 'How AI Payment Recovery Works | PraecisAI' },
  description:
    'How AI payment recovery works, step by step: data ingest, four-stage auto-segmentation, AI calls and WhatsApp, and automatic promise-to-pay follow-up.',
  alternates: { canonical: '/how-it-works' },
};

const steps = [
  {
    title: 'Data comes in, manually or automatically',
    body: 'Upload your outstanding Excel or CSV, or let our team integrate directly with Tally, Zoho Books, SAP or whatever you already run. PraecisAI ingests customer details, outstanding amount, invoice and ledger history, and past communication. Column names are auto-mapped, so no reformatting is needed.',
  },
  {
    title: 'Auto-segmentation into four recovery stages',
    body: 'Every party is scored into Soft Reminder, Follow-up, Strong Follow-up or Escalation. You decide the day-ranges: for example Soft Reminder 90 to 120 days, Follow-up 120 to 150, Strong Follow-up 150 to 200, Escalation 200 and above. Ageing is calculated per bill with credit notes netted off.',
  },
  {
    title: 'AI calls and WhatsApp go out on your schedule',
    body: 'PraecisAI calls every customer on the outstanding list, hundreds of parties in minutes, only in the time slots you allow. WhatsApp reminders with a branded PDF statement go out on your cadence. Tone shifts by stage, from a polite nudge in Soft Reminder to a direct, firm message in Escalation.',
  },
  {
    title: 'Every promise is logged and chased automatically',
    body: 'When a customer promises payment in seven days, PraecisAI records it and calls back exactly when due, or after the grace period you set. Grace periods can differ per stage: more slack in Soft Reminder, none in Escalation.',
  },
];

const underTheHood = [
  {
    title: 'Conversation memory across calls',
    body: 'Call five already knows the full history and summary of calls one to four. A party never gets to restart the story, and no promise falls between two conversations.',
  },
  {
    title: 'Live transfer to a human',
    body: 'A disputed amount or a request for a person transfers the call straight to your accountant, with a WhatsApp briefing sent ahead so they know the context before they speak.',
  },
  {
    title: 'Bilingual, natural voice',
    body: 'Calls run in conversational Hindi and English rather than recorded playback, which is why most parties respond the way they would to a human collections call.',
  },
  {
    title: 'Five owner reports every week',
    body: 'Positive Response, Negative Response, Promise to Pay, Escalation and Payment Summary, so you always know where the cash is stuck without asking anyone.',
  },
];

const faqs = [
  {
    question: 'How long does it take to go live?',
    answer:
      'Most businesses are live within 10 minutes on manual upload. Software integrations such as Tally, Zoho or SAP typically take a few days depending on your existing system.',
  },
  {
    question: 'Do we have to upload every day?',
    answer:
      'Only if you choose the manual route. With a direct integration your outstanding data syncs automatically and no daily upload is needed.',
  },
  {
    question: 'Can we control when calls go out?',
    answer:
      'Yes. Calling windows, WhatsApp cadence, stage day-ranges and per-stage grace periods are all configurable per business.',
  },
  {
    question: 'What happens if a party disputes the amount?',
    answer:
      'PraecisAI transfers the call live to your accountant or team with an instant WhatsApp briefing, so the dispute is handled by a human on the same call.',
  },
];

export default function HowItWorksPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How AI payment recovery works with PraecisAI',
    description:
      'Four automated steps that take a business from an outstanding ledger to recovered cash.',
    step: steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return (
    <MarketingPage crumbs={[{ label: 'How it works', href: '/how-it-works' }]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([howToJsonLd, faqJsonLd]) }}
      />

      <PageHero
        eyebrow="How it works"
        title="How AI Payment Recovery Works, Step by Step"
        lead="How AI payment recovery works in practice is simpler than most accounts receivable software makes it sound. PraecisAI takes your outstanding data, sorts every party into four recovery stages you define, then calls and WhatsApps them automatically until they pay, remembering every conversation along the way. Here is each step in detail."
      />

      <Section
        tone="cream"
        title="From outstanding data to recovered cash"
        intro="Four steps, every one of them configurable to how your business actually chases payments."
      >
        <CardGrid items={steps} numbered />
      </Section>

      <Section
        tone="warm"
        title="What makes this different from a calling bot"
        intro="A recorded reminder call treats every conversation as the first one. This does not."
      >
        <CardGrid items={underTheHood} />
      </Section>

      <Section tone="cream" title="Common questions about the process">
        <FaqList faqs={faqs} />
      </Section>

      <Section tone="warm" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: 'Features',
              href: '/features',
              description: 'AI voice calls, WhatsApp, PDF statements, promise tracker, reports.',
            },
            {
              label: 'Industries',
              href: '/industries',
              description: 'How the setup changes for textile, pharma and hardware businesses.',
            },
            {
              label: 'Pricing',
              href: '/pricing',
              description: '₹5,000 per month platform fee, published openly.',
            },
          ]}
        />
      </Section>

      <CtaBand />
    </MarketingPage>
  );
}
