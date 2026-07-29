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
  title: { absolute: 'AI Voice Calls & WhatsApp Reminders | PraecisAI' },
  description:
    'PraecisAI features: Hindi and English AI voice calls, WhatsApp payment reminders, branded PDF statements, promise-to-pay tracking and weekly owner reports.',
  alternates: { canonical: '/features' },
};

const channels = [
  {
    title: 'AI voice calls in Hindi and English',
    body: 'Natural, conversational calls that explain the outstanding, handle the usual objections, take a promise to pay and log the response. Not recorded playback, which is why parties respond to it the way they respond to a person.',
  },
  {
    title: 'WhatsApp payment reminders',
    body: 'Personalised with party name, bill numbers and due amount, sent in bulk with read receipts tracked. Message tone changes automatically with the recovery stage the party is in.',
  },
  {
    title: 'Branded PDF statements',
    body: 'A professional outstanding statement generated per party and delivered over WhatsApp, listing every open bill with its own age. It gives the buyer something concrete to hand to their own accounts team.',
  },
  {
    title: 'Live call transfer to your accountant',
    body: 'When a party disputes an amount or asks for a human, the call transfers straight through, with an instant WhatsApp briefing so your accountant knows the context before they answer.',
  },
];

const intelligence = [
  {
    title: 'Conversation memory',
    body: 'Every call carries the full history and summary of previous calls with that party. No customer repeats themselves, and no promise gets lost between two conversations.',
  },
  {
    title: 'Promise-to-pay tracker',
    body: 'Every commitment is logged with its date. The follow-up call is scheduled automatically for that date, or after the grace period you set for that stage.',
  },
  {
    title: 'Four-stage smart segmentation',
    body: 'Parties move through Soft Reminder, Follow-up, Strong Follow-up and Escalation based on day-ranges you set. Ageing is calculated per bill with credit notes netted off.',
  },
  {
    title: 'Configurable grace periods',
    body: 'Give a party entering Soft Reminder more slack than one deep in Escalation. PraecisAI applies your rule automatically on every call, without anyone having to remember it.',
  },
];

const reports = [
  {
    title: 'Positive Response',
    body: 'Every party responding well to outreach this week, so your team knows where a human follow-up will actually land.',
  },
  {
    title: 'Negative Response',
    body: 'Repeated non-pickups, broken promises, disputes and hostile replies, surfaced together rather than buried in call logs.',
  },
  {
    title: 'Promise to Pay',
    body: 'Every commitment made, with the date it was made for, so nothing depends on somebody remembering a phone call.',
  },
  {
    title: 'Escalation Report',
    body: 'Accounts past your value or ageing threshold, delivered to the owner and the accountant while recovery is still realistic.',
  },
  {
    title: 'Payment Summary',
    body: 'Which stage and which segment your cash is actually coming from, so you can tune the ladder rather than guess at it.',
  },
  {
    title: 'Live recovery dashboard',
    body: 'Real-time ageing breakdown, recovery rate and party-level status, updated as calls and messages go out.',
  },
];

const faqs = [
  {
    question: 'Which languages do the AI voice calls support?',
    answer: 'Hindi and English currently, with more Indian languages planned.',
  },
  {
    question: 'Can we use only WhatsApp and skip the calls?',
    answer:
      'Yes. Channels and cadence are configured per business, so you can run WhatsApp reminders and statements without voice calls if you prefer.',
  },
  {
    question: 'Do the PDF statements carry our branding?',
    answer:
      'Yes. Statements are generated with your business branding and list each open bill with its own ageing.',
  },
  {
    question: 'Can specific parties be excluded from automated contact?',
    answer:
      'Yes. Any party can be marked as excluded from automated calls and messages while still appearing in your ageing and reports.',
  },
];

export default function FeaturesPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <MarketingPage crumbs={[{ label: 'Features', href: '/features' }]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="Features"
        title="AI Voice Calls, WhatsApp Reminders and Promise Tracking"
        lead="AI voice calls and WhatsApp payment reminders are only half of what recovers money. The other half is the system underneath: promise-to-pay tracking, conversation memory across every call, configurable escalation, and the weekly reports that tell an owner where the cash is stuck. Here is everything PraecisAI does."
      />

      <Section
        tone="cream"
        title="Every channel your collections team would use"
        intro="One outstanding upload drives all of them, on the schedule you configure."
      >
        <CardGrid items={channels} />
      </Section>

      <Section
        tone="warm"
        title="The intelligence underneath"
        intro="This is what separates PraecisAI from an automated dialler running a script."
      >
        <CardGrid items={intelligence} />
      </Section>

      <Section
        tone="cream"
        title="Reports built for every role"
        intro="Delivered automatically each week to the people who need them."
      >
        <CardGrid items={reports} />
      </Section>

      <Section tone="warm" title="Feature questions">
        <FaqList faqs={faqs} />
      </Section>

      <Section tone="cream" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: 'How it works',
              href: '/how-it-works',
              description: 'The four automated steps, in detail.',
            },
            {
              label: 'Industries',
              href: '/industries',
              description: 'How the configuration changes by trade.',
            },
            {
              label: 'Pricing',
              href: '/pricing',
              description: 'What all of this costs, published openly.',
            },
          ]}
        />
      </Section>

      <CtaBand />
    </MarketingPage>
  );
}
