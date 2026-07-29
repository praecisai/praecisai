import type { Metadata } from 'next';
import MarketingPage from '../components/marketing/MarketingPage';
import { PageHero, Section, FaqList, CtaBand, RelatedLinks } from '../components/marketing/blocks';
import { faqGroups, allFaqs } from '@/lib/content/faqs';

export const metadata: Metadata = {
  title: { absolute: 'AI Payment Recovery FAQ | PraecisAI' },
  description:
    'Answers on AI payment recovery: Excel and Tally imports, call languages, disputes and live transfer, data security in India, setup time, pricing and contracts.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <MarketingPage crumbs={[{ label: 'FAQ', href: '/faq' }]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="FAQ"
        title="AI Payment Recovery Questions, Answered"
        lead="Everything businesses ask before putting their outstanding ledger onto an AI calling agent: which file formats work, whether customers can tell it is automated, what happens when someone disputes an amount, where the data lives, and exactly what it costs."
      />

      {faqGroups.map((group, i) => (
        <Section key={group.heading} tone={i % 2 === 0 ? 'cream' : 'warm'} title={group.heading}>
          <FaqList faqs={group.faqs} />
        </Section>
      ))}

      <Section tone="cream" title="Still have questions?">
        <div className="rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-5 py-6 sm:px-8 sm:py-7">
          <p className="font-body text-[14px] leading-[1.75] text-[var(--walnut)]">
            Message us on WhatsApp using the button on this page, or email{' '}
            <a
              href="mailto:hello@praecisai.in"
              className="font-semibold text-[var(--mahogany)] underline underline-offset-4 hover:text-[var(--rust)]"
            >
              hello@praecisai.in
            </a>
            . No sales sequence, just an answer.
          </p>
        </div>
      </Section>

      <Section tone="warm" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: 'Pricing',
              href: '/pricing',
              description: 'Published pricing, no lock-in, no sales call required.',
            },
            {
              label: 'How it works',
              href: '/how-it-works',
              description: 'The four automated steps, in detail.',
            },
            {
              label: 'Industries',
              href: '/industries',
              description: 'Textile, pharma and hardware specifics.',
            },
          ]}
        />
      </Section>

      <CtaBand />
    </MarketingPage>
  );
}
