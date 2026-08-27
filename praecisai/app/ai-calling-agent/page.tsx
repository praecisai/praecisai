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
  title: { absolute: 'AI Calling Agent for Payment Collection India | PraecisAI' },
  description:
    'An AI calling agent that calls your B2B debtors in Hindi and English, sends WhatsApp reminders and transfers disputes live to your team. Built for Indian MSMEs.',
  alternates: { canonical: '/ai-calling-agent' },
  openGraph: {
    title: 'AI Calling Agent for Payment Collection India | PraecisAI',
    description:
      'An AI calling agent that calls your B2B debtors in Hindi and English, sends WhatsApp reminders and transfers disputes live to your team.',
    url: `${SITE_URL}/ai-calling-agent`,
    type: 'website',
  },
};

const painPoints = [
  {
    title: 'Your accounts team cannot call everyone',
    body: 'A two-person accounts team managing 300 open accounts cannot call every debtor every week. Calls happen for the biggest accounts only, and the long tail ages quietly.',
  },
  {
    title: 'Human callers get inconsistent results',
    body: 'The quality of a follow-up call depends on who makes it, when they make it, and how tired they are. An AI calling agent delivers the same disciplined script every time.',
  },
  {
    title: 'Promising to call and not calling is worse than not calling',
    body: 'A debtor who gets a call on day 30, hears nothing on day 60, and gets called again on day 90 learns that your follow-up system has gaps. They optimise for those gaps.',
  },
  {
    title: 'Language barriers slow down resolution',
    body: 'A buyer who is more comfortable in Hindi than English will delay rather than engage in a language they find difficult. Most human calling teams cannot cover both fluently.',
  },
];

const howItWorks = [
  {
    title: 'Upload your outstanding ledger',
    body: 'Import from Excel, CSV or Tally. The AI calling agent ingests your outstanding list, calculates ageing per bill, and builds its call queue in minutes.',
  },
  {
    title: 'AI calls each debtor in their preferred language',
    body: 'The agent calls in Hindi or English, introduces itself as calling on behalf of your business, confirms the outstanding amount, and asks for a payment commitment or date.',
  },
  {
    title: 'Sends a WhatsApp reminder with your branded statement',
    body: 'Every call is followed by a WhatsApp message with a PDF ledger statement showing exactly which bills are open, so the buyer has everything they need to pay.',
  },
  {
    title: 'Transfers disputes and escalations live to your team',
    body: 'When a debtor raises a dispute or escalation, the call transfers live to your accountant with an instant WhatsApp briefing on what was said — so nothing falls through the cracks.',
  },
];

const stats = [
  { value: '10 min', label: 'Time to go live from data upload' },
  { value: 'Hindi + English', label: 'AI calling agent languages' },
  { value: '4 stages', label: 'Configurable escalation ladder' },
];

const faqs = [
  {
    question: 'What is an AI calling agent for payment collection?',
    answer:
      'An AI calling agent is software that automatically calls your B2B debtors, delivers a configurable follow-up script in Hindi or English, logs the response, sends a WhatsApp reminder, and escalates disputes or high-value accounts to a human. It replaces or augments the manual calling done by your accounts team.',
  },
  {
    question: 'Can debtors tell the call is automated?',
    answer:
      'The AI introduces itself as calling on behalf of your business, which is accurate and transparent. Most callers engage with it as they would with any collections call — because it answers questions, logs responses, and takes next steps like a trained human caller would.',
  },
  {
    question: 'What languages does the AI calling agent support?',
    answer:
      'Currently Hindi and English, including code-switching mid-conversation. Regional language support is on the roadmap. The language used can be set per account or detected automatically from the debtor\'s response.',
  },
  {
    question: 'What happens when the AI cannot resolve the call?',
    answer:
      'Disputes, escalations, and calls where the debtor requests a human are transferred live to your designated team member. The transfer comes with an instant WhatsApp briefing so your team is never walking in cold.',
  },
  {
    question: 'How is this different from a robocall or IVR?',
    answer:
      'Unlike a robocall or IVR, the AI calling agent carries on a real conversation — it listens to what the debtor says, responds to questions, handles objections, logs a promise-to-pay date, and adapts its tone based on the ageing stage of the account.',
  },
  {
    question: 'How quickly can we go live?',
    answer:
      'Upload your outstanding ledger, configure your escalation stages and call windows, and the AI calling agent is running within 10 minutes. No engineering work needed on your end.',
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

export default function AiCallingAgentPage() {
  return (
    <MarketingPage crumbs={[{ label: 'AI Calling Agent', href: '/ai-calling-agent' }]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="AI Calling Agent"
        title="AI Calling Agent for Payment Recovery in India"
        lead="PraecisAI is an AI calling agent that calls your B2B debtors in Hindi and English, logs every response, sends WhatsApp reminders with branded statements, and transfers disputes live to your team — automatically, at scale, without adding headcount."
      />

      <Section tone="cream">
        <StatStrip stats={stats} />
      </Section>

      <Section
        tone="warm"
        title="Why manual calling fails at scale"
        intro="The follow-up problem in B2B collections is not one of intent — it is one of capacity. Here is where manual calling breaks down."
      >
        <CardGrid items={painPoints} />
      </Section>

      <Section
        tone="cream"
        title="How the AI calling agent works"
        intro="Four steps from outstanding data to recovered cash — all automated, all configurable."
      >
        <CardGrid items={howItWorks} numbered />
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
              description: 'How the full collections workflow — calls, WhatsApp, statements — fits together.',
            },
            {
              label: 'How it works',
              href: '/how-it-works',
              description: 'The four automated steps from outstanding data to recovered cash.',
            },
            {
              label: 'Industries',
              href: '/industries',
              description: 'Textile, pharma, hardware, manufacturing — industry-specific configurations.',
            },
            {
              label: 'AI Calling Agent vs Human Telecaller',
              href: '/compare/ai-calling-agent-vs-human-telecaller',
              description: 'Side-by-side comparison of AI and human collections calling.',
            },
          ]}
        />
      </Section>

      <CtaBand
        heading="See the AI calling agent work on a real ledger"
        body="Open the live demo dashboard and watch an AI call, a WhatsApp reminder and a branded statement go out in real time."
      />
    </MarketingPage>
  );
}
