import type { Metadata } from 'next';
import Link from 'next/link';
import { IconArrowRight, IconTrendingUp } from '@tabler/icons-react';
import MarketingPage from '../components/marketing/MarketingPage';
import { PageHero, Section, CtaBand } from '../components/marketing/blocks';
import { caseStudies } from '@/lib/content/case-studies';

export const metadata: Metadata = {
  title: { absolute: 'Payment Recovery Case Studies | PraecisAI' },
  description:
    'Real Indian businesses using an AI calling agent to recover outstanding payments, with the results they reported after moving follow-up onto PraecisAI.',
  alternates: { canonical: '/case-studies' },
};

export default function CaseStudiesPage() {
  return (
    <MarketingPage crumbs={[{ label: 'Case studies', href: '/case-studies' }]}>
      <PageHero
        eyebrow="Case studies"
        title="Payment Recovery Case Studies from Indian Businesses"
        lead="Payment recovery works best when you can see what it replaced. These are businesses that moved their outstanding follow-up onto PraecisAI's AI calling agent, what collections looked like before, and the results they reported afterwards."
      />

      <Section tone="cream">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {caseStudies.map((study) => (
            <Link
              key={study.slug}
              href={`/case-studies/${study.slug}`}
              className="group flex flex-col rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-6 transition-all duration-200 hover:border-[var(--mahogany)] hover:shadow-[0_12px_40px_rgba(127,85,57,0.12)] sm:p-8"
            >
              <span className="font-body text-[11px] font-semibold uppercase tracking-widest text-[var(--rust)]">
                {study.industryName} · {study.location}
              </span>
              <h2 className="mt-3 font-display text-[17px] font-semibold leading-snug text-[var(--dark-brown)] sm:text-[19px]">
                {study.company}
              </h2>
              <p className="mt-3 inline-flex items-center gap-1.5 font-display text-[14px] font-semibold text-[var(--mahogany)]">
                <IconTrendingUp size={15} stroke={2} />
                {study.outcome}
              </p>
              <p className="mt-3 flex-1 font-body text-[13px] leading-[1.75] text-[var(--walnut)] sm:text-[14px]">
                &ldquo;{study.quote}&rdquo;
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-body text-[13px] font-semibold text-[var(--mahogany)]">
                Read the full story
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

      <CtaBand />
    </MarketingPage>
  );
}
