import type { Metadata } from 'next';
import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import MarketingPage from '../components/marketing/MarketingPage';
import { PageHero, Section, CtaBand, RelatedLinks } from '../components/marketing/blocks';
import { industries } from '@/lib/content/industries';

export const metadata: Metadata = {
  title: { absolute: 'AI Credit Recovery by Industry | PraecisAI' },
  description:
    'AI payment and credit recovery built for how your industry sells on credit: textile and garments, pharma distribution, and hardware and building materials.',
  alternates: { canonical: '/industries' },
};

export default function IndustriesPage() {
  return (
    <MarketingPage crumbs={[{ label: 'Industries', href: '/industries' }]}>
      <PageHero
        eyebrow="Industries"
        title="AI Credit Recovery Built for Your Industry"
        lead="Credit recovery software works differently in a textile mill, a pharma distribution house and a hardware wholesaler, because each one sells on credit differently. PraecisAI is an AI calling agent configured to the ageing buckets, escalation ladder and call tone that match your trade. Pick your industry below to see the specifics."
      />

      <Section tone="cream">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {industries.map((industry) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="group flex flex-col rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-6 transition-all duration-200 hover:border-[var(--mahogany)] hover:shadow-[0_12px_40px_rgba(127,85,57,0.12)] sm:p-8"
            >
              <h2 className="font-display text-[17px] font-semibold leading-snug text-[var(--dark-brown)] sm:text-[19px]">
                {industry.name}
              </h2>
              <p className="mt-3 flex-1 font-body text-[13px] leading-[1.75] text-[var(--walnut)] sm:text-[14px]">
                {industry.metaDescription}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-body text-[13px] font-semibold text-[var(--mahogany)]">
                Read more
                <IconArrowRight
                  size={14}
                  stroke={2}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        tone="warm"
        title="Not on the list?"
        intro="PraecisAI is used across distribution, manufacturing and trading businesses that sell on credit. If your trade is not listed, the configuration principles are the same: your ageing buckets, your escalation ladder, your call timings."
      >
        <RelatedLinks
          links={[
            {
              label: 'How it works',
              href: '/how-it-works',
              description: 'Four automated steps from outstanding data to recovered cash.',
            },
            {
              label: 'Features',
              href: '/features',
              description: 'AI voice calls, WhatsApp, PDF statements, promise tracking, reports.',
            },
            {
              label: 'Pricing',
              href: '/pricing',
              description: 'Published pricing, no lock-in, no sales call required.',
            },
          ]}
        />
      </Section>

      <CtaBand />
    </MarketingPage>
  );
}
