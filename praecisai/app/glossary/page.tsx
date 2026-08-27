import type { Metadata } from 'next';
import MarketingPage, { SITE_URL } from '../components/marketing/MarketingPage';
import { PageHero, Section, CtaBand } from '../components/marketing/blocks';

export const metadata: Metadata = {
  title: { absolute: 'B2B Collections Glossary | PraecisAI' },
  description:
    'Definitions for common accounts receivable and B2B collections terms used in India, including DSO, Ageing Buckets, Promise-to-Pay, and more.',
  alternates: { canonical: '/glossary' },
};

const terms = [
  {
    term: 'Accounts Receivable (AR)',
    definition:
      'The balance of money due to a firm for goods or services delivered or used but not yet paid for by customers. In Indian B2B trade, this is often simply called "the outstanding".',
  },
  {
    term: 'Ageing Bucket',
    definition:
      'A time classification (e.g., 0-30 days, 31-60 days, 61-90 days) used to categorise unpaid invoices based on how long they have been outstanding past their due date. This dictates the tone and urgency of the follow-up.',
  },
  {
    term: 'Collections Waterfall',
    definition:
      'The scheduled escalation path for an unpaid invoice. For example: a polite reminder at 30 days, a firm call at 60 days, and a management escalation at 90 days.',
  },
  {
    term: 'Credit Period',
    definition:
      'The number of days a buyer is given to pay an invoice before it is considered overdue. While 30 days is standard, in Indian textiles and manufacturing, this often stretches to 90 or 120 days by convention.',
  },
  {
    term: 'Days Sales Outstanding (DSO)',
    definition:
      'A metric showing the average number of days it takes a company to collect payment after a sale has been made. A lower DSO means the business is collecting its receivables faster, improving cash flow.',
  },
  {
    term: 'Escalation',
    definition:
      'The process of moving an unpaid account from routine follow-up (handled by junior staff or automation) to a higher authority (like the owner or CFO) when routine methods fail or the risk increases.',
  },
  {
    term: 'Ledger Statement',
    definition:
      'A running record of all transactions (invoices, payments, credit notes) between a seller and a buyer. Sharing a clear, reconciled ledger statement is often a prerequisite for getting an Indian B2B buyer to process a payment.',
  },
  {
    term: 'Promise-to-Pay (PTP)',
    definition:
      'A commitment made by a debtor to pay a specific amount on a specific date. Tracking PTP dates and calling back precisely when promised is a core function of effective accounts receivable management.',
  },
  {
    term: 'Working Capital',
    definition:
      'The capital of a business which is used in its day-to-day trading operations, calculated as current assets minus current liabilities. Unpaid accounts receivable directly reduce available working capital.',
  },
];

export default function GlossaryPage() {
  return (
    <MarketingPage crumbs={[{ label: 'Glossary', href: '/glossary' }]}>
      <PageHero
        eyebrow="Glossary"
        title="B2B Collections Glossary"
        lead="Definitions for common accounts receivable and payment recovery terms used in Indian B2B trade."
      />

      <Section tone="cream">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)]">
          <dl className="divide-y divide-[var(--caramel)]">
            {terms.map((item) => (
              <div key={item.term} className="px-5 py-6 sm:px-8 sm:py-8">
                <dt className="font-display text-[17px] font-semibold text-[var(--dark-brown)] sm:text-[19px]">
                  {item.term}
                </dt>
                <dd className="mt-3 max-w-3xl font-body text-[14.5px] leading-[1.75] text-[var(--walnut)] sm:text-[15.5px]">
                  {item.definition}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <CtaBand />
    </MarketingPage>
  );
}
