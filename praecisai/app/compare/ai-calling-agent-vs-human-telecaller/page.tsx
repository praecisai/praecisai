import type { Metadata } from 'next';
import MarketingPage, { SITE_URL } from '../../components/marketing/MarketingPage';
import {
  PageHero,
  Section,
  CompareTable,
  FaqList,
  CtaBand,
  RelatedLinks,
} from '../../components/marketing/blocks';

export const metadata: Metadata = {
  title: { absolute: 'AI Calling Agent vs Human Telecaller | PraecisAI' },
  description:
    'AI calling agent vs human telecaller for payment recovery: cost, coverage, consistency and scalability compared side by side for Indian B2B businesses.',
  alternates: { canonical: '/compare/ai-calling-agent-vs-human-telecaller' },
  openGraph: {
    title: 'AI Calling Agent vs Human Telecaller | PraecisAI',
    description:
      'Side-by-side comparison of AI calling agents and human telecallers for B2B payment recovery in India.',
    url: `${SITE_URL}/compare/ai-calling-agent-vs-human-telecaller`,
    type: 'website',
  },
};

const compareRows = [
  {
    aspect: 'Coverage',
    a: 'Calls every account on the list — 50 or 5,000 — in the time window you set. Nobody is skipped because of capacity.',
    b: 'A telecaller with a full workload calls 50 to 80 accounts a day. The long tail does not get called consistently.',
  },
  {
    aspect: 'Consistency',
    a: 'Delivers the same script, tone and escalation ladder on every call, every day, with no variation based on mood, fatigue or workload.',
    b: 'Call quality varies by agent, by day and by time of day. High-volume periods and afternoon slumps both affect outcomes.',
  },
  {
    aspect: 'Languages',
    a: 'Hindi and English, including code-switching mid-conversation, configured per account or detected from debtor response.',
    b: 'Depends on the individual telecaller. Most handle one language fluently; bilingual callers are rare and cost more.',
  },
  {
    aspect: 'Cost',
    a: '₹5,000/month flat. No per-call cost, no salary burden, no PF/ESI, no attrition costs.',
    b: '₹15,000–₹30,000/month per full-time telecaller, plus statutory costs, management overhead and replacement cost on attrition.',
  },
  {
    aspect: 'Scalability',
    a: 'Scale instantly — add 500 accounts tomorrow with no additional headcount, no training lag.',
    b: 'Each new hire takes 4 to 8 weeks to recruit, train and bring to full productivity.',
  },
  {
    aspect: 'Availability',
    a: 'Calls within your configured window every day, including weekends and festival periods.',
    b: 'Bound by working hours, leaves, public holidays and festival shutdowns.',
  },
  {
    aspect: 'Promise tracking',
    a: 'Every promise-to-pay date is logged automatically and triggers a callback on exactly that date.',
    b: 'Depends on manual CRM entry discipline. Promises recorded in one agent\'s notes are often missed after attrition.',
  },
  {
    aspect: 'Dispute handling',
    a: 'Transfers the call live to your team with a WhatsApp briefing. Dispute is escalated immediately with full context.',
    b: 'Human callers can exercise judgement in a dispute conversation but may lack account context or authority to resolve.',
  },
  {
    aspect: 'Reporting',
    a: 'Full call log, response log and escalation report available at any time. Every interaction auditable.',
    b: 'Depends on CRM discipline. Reporting is often incomplete and varies by team member.',
  },
  {
    aspect: 'Relationship risk',
    a: 'Tone is configured per stage — soft early, firm late. Long-term accounts can be excluded from automated contact.',
    b: 'Relationship damage usually comes from inconsistent tone, not from the call being AI-driven.',
  },
];

const faqs = [
  {
    question: 'Will my customers react badly to an AI calling agent?',
    answer:
      'Most debtors engage with the AI as they would any collections call — because it answers questions, handles objections and takes next steps. The AI introduces itself as calling on behalf of your business, which is accurate. In practice, engagement rates are comparable to human callers for routine reminders.',
  },
  {
    question: 'Is an AI calling agent better than a human for every account?',
    answer:
      'Not for every account. Long-term relationships, active disputes and high-value escalations are best handled by a human. An AI calling agent is better at covering the full ledger consistently — the volume work that human teams cannot sustain at scale. The two work together, not in competition.',
  },
  {
    question: 'Can I keep a human telecaller and add an AI calling agent?',
    answer:
      'Yes. Many teams use PraecisAI for routine follow-up across the full ledger and reserve their human callers for escalations, disputes and key account conversations.',
  },
  {
    question: 'What happens to accounts the AI cannot resolve?',
    answer:
      'Disputes, escalations and accounts past your value or ageing threshold are surfaced in weekly escalation reports or transferred live to your team, depending on the scenario.',
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

export default function AiCallingAgentVsHumanPage() {
  return (
    <MarketingPage
      crumbs={[
        { label: 'Compare', href: '/compare/ai-calling-agent-vs-human-telecaller' },
        { label: 'AI Calling Agent vs Human Telecaller', href: '/compare/ai-calling-agent-vs-human-telecaller' },
      ]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="Compare"
        title="AI Calling Agent vs Human Telecaller for Payment Recovery"
        lead="For Indian B2B businesses, the choice between an AI calling agent and a human telecaller is usually a question of scale and coverage — not quality vs automation. Here is a complete side-by-side comparison across the dimensions that matter for collections."
      />

      <Section
        tone="cream"
        title="AI Calling Agent vs Human Telecaller"
        intro="Ten dimensions that determine collections effectiveness. AI in the left column, human telecaller in the right."
      >
        <CompareTable
          colA="AI Calling Agent (PraecisAI)"
          colB="Human Telecaller"
          rows={compareRows}
        />
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
              description: 'How the PraecisAI AI calling agent works in detail.',
            },
            {
              label: 'AI Payment Recovery vs Manual Follow-up',
              href: '/compare/ai-payment-recovery-vs-manual-followup',
              description: 'Compare the full AI payment recovery workflow against manual processes.',
            },
            {
              label: 'Pricing',
              href: '/pricing',
              description: '₹5,000/month flat. No per-call cost, no lock-in.',
            },
          ]}
        />
      </Section>

      <CtaBand
        heading="See the AI calling agent in action"
        body="Open the live demo and watch an AI call, WhatsApp reminder and branded statement go out — on a real ledger."
      />
    </MarketingPage>
  );
}
