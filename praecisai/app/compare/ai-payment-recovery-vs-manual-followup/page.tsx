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
  title: { absolute: 'AI Payment Recovery vs Manual Follow-up | PraecisAI' },
  description:
    'AI payment recovery vs manual follow-up: full comparison of cost, coverage, DSO impact and scalability for Indian B2B businesses.',
  alternates: { canonical: '/compare/ai-payment-recovery-vs-manual-followup' },
  openGraph: {
    title: 'AI Payment Recovery vs Manual Follow-up | PraecisAI',
    description:
      'Full comparison of AI-automated and manual payment recovery for B2B collections in India.',
    url: `${SITE_URL}/compare/ai-payment-recovery-vs-manual-followup`,
    type: 'website',
  },
};

const compareRows = [
  {
    aspect: 'Coverage',
    a: 'Every account in the outstanding list gets followed up on schedule — 50 or 5,000 — with no capacity ceiling.',
    b: 'Follow-up happens for key accounts only. The long tail ages without contact because the team does not have time.',
  },
  {
    aspect: 'Speed of first contact',
    a: 'First call goes out at the exact day you configure — often day 30 — automatically, from the moment the ledger is uploaded.',
    b: 'First contact depends on when someone has time to review the ageing report and make calls. Often day 45 to 60 in practice.',
  },
  {
    aspect: 'Follow-up consistency',
    a: 'Every account gets the same follow-up cadence on the same schedule. No accounts are missed because someone was on leave.',
    b: 'Cadence depends on individual discipline, workload and availability. Promised callbacks are frequently missed.',
  },
  {
    aspect: 'Promise-to-pay tracking',
    a: 'Every commitment is logged automatically and drives the next touchpoint. No manual CRM entry needed.',
    b: 'Promises are tracked in spreadsheets or CRM fields that depend on manual discipline to update. Misses are common.',
  },
  {
    aspect: 'DSO impact',
    a: 'Earlier and more consistent follow-up reduces the average time-to-payment. Accounts that previously aged silently now get resolved at 30–60 days.',
    b: 'DSO is often higher than it needs to be because follow-up starts late and does not sustain the right cadence.',
  },
  {
    aspect: 'Cost per account',
    a: '₹5,000/month regardless of account count. Per-account cost drops as the ledger grows.',
    b: 'Staff cost, time cost and opportunity cost all scale with party count. A larger ledger means higher cost or lower coverage.',
  },
  {
    aspect: 'Dispute escalation',
    a: 'Disputes are detected on the call and transferred live to your team with a WhatsApp briefing — same call, full context.',
    b: 'Disputes are often logged manually, sit in an inbox, and surface in a weekly meeting after the account has aged further.',
  },
  {
    aspect: 'Reporting and audit trail',
    a: 'Every call, response, promise and escalation is logged with a timestamp. Full audit trail available at any time.',
    b: 'Reporting depends on CRM discipline. Audit trails are often incomplete or based on memory.',
  },
  {
    aspect: 'Scalability',
    a: 'Add 500 new accounts to the ledger tomorrow — no additional headcount, no training lag, no process change.',
    b: 'Scaling follow-up means hiring, training and managing more people, with a 4–8 week lag before they are productive.',
  },
  {
    aspect: 'Relationship risk',
    a: 'Escalation tone is configured per stage. Long-term accounts can be excluded from automated calls entirely.',
    b: 'Inconsistent tone from different callers (or the same caller on different days) creates more relationship risk than the channel itself.',
  },
];

const faqs = [
  {
    question: 'Can AI payment recovery completely replace my manual follow-up process?',
    answer:
      'For routine reminders, promise chasing and standard follow-up: yes. For dispute resolution, active negotiations and relationship-sensitive conversations: your team still handles those, but they are routed directly by the AI rather than found manually.',
  },
  {
    question: 'Will AI payment recovery work for my industry?',
    answer:
      'PraecisAI is configured around your ageing buckets, escalation stages and call windows — not a fixed industry template. It is used by textile distributors, pharma stockists, hardware dealers, manufacturers and wholesalers across India.',
  },
  {
    question: 'How long does it take to see a DSO improvement?',
    answer:
      'Most businesses see a measurable reduction in average collection time within the first 60 days — primarily because follow-up starts earlier and the long tail finally gets consistent contact. The exact improvement depends on your baseline and industry.',
  },
  {
    question: 'What happens to my existing manual process when I switch?',
    answer:
      'You can run both in parallel during the transition. Many teams start with PraecisAI covering their full outstanding list and keep their human process for escalations and key accounts while they see results.',
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

export default function AiVsManualPage() {
  return (
    <MarketingPage
      crumbs={[
        { label: 'Compare', href: '/compare/ai-payment-recovery-vs-manual-followup' },
        { label: 'AI Payment Recovery vs Manual Follow-up', href: '/compare/ai-payment-recovery-vs-manual-followup' },
      ]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="Compare"
        title="AI Payment Recovery vs Manual Follow-up"
        lead="Manual payment follow-up fails at scale — not because teams do not try, but because capacity, consistency and coverage cannot be sustained across hundreds of accounts without automation. Here is a full comparison of AI-powered and manual payment recovery across ten dimensions."
      />

      <Section
        tone="cream"
        title="AI Payment Recovery vs Manual Follow-up"
        intro="AI-automated recovery in the left column, manual follow-up in the right. Ten dimensions that determine collections effectiveness."
      >
        <CompareTable
          colA="AI Payment Recovery (PraecisAI)"
          colB="Manual Follow-up"
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
              label: 'Payment Recovery Software',
              href: '/payment-recovery-software',
              description: 'How PraecisAI fits into the broader payment recovery landscape.',
            },
            {
              label: 'AI Calling Agent vs Human Telecaller',
              href: '/compare/ai-calling-agent-vs-human-telecaller',
              description: 'Compare the calling component specifically — AI agent vs human telecaller.',
            },
            {
              label: 'How it works',
              href: '/how-it-works',
              description: 'The four automated steps from outstanding data to recovered cash.',
            },
          ]}
        />
      </Section>

      <CtaBand
        heading="See AI payment recovery running live"
        body="Open the demo dashboard and watch the full automated follow-up workflow — call, WhatsApp, statement — on a real ledger."
      />
    </MarketingPage>
  );
}
