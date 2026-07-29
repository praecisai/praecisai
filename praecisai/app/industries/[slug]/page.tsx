import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IconQuote, IconStarFilled } from '@tabler/icons-react';
import MarketingPage, { SITE_URL } from '../../components/marketing/MarketingPage';
import {
  PageHero,
  Section,
  CardGrid,
  StatStrip,
  FaqList,
  CtaBand,
  RelatedLinks,
} from '../../components/marketing/blocks';
import { industries, getIndustry } from '@/lib/content/industries';
import { getCaseStudy } from '@/lib/content/case-studies';

export function generateStaticParams() {
  return industries.map((industry) => ({ slug: industry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};
  return {
    title: { absolute: industry.metaTitle },
    description: industry.metaDescription,
    alternates: { canonical: `/industries/${industry.slug}` },
    openGraph: {
      title: industry.metaTitle,
      description: industry.metaDescription,
      url: `${SITE_URL}/industries/${industry.slug}`,
      type: 'website',
    },
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  const caseStudy = industry.caseStudy ? getCaseStudy(industry.caseStudy) : undefined;
  const others = industries.filter((i) => i.slug !== industry.slug);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: industry.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <MarketingPage
      crumbs={[
        { label: 'Industries', href: '/industries' },
        { label: industry.name, href: `/industries/${industry.slug}` },
      ]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero eyebrow={industry.eyebrow} title={industry.h1} lead={industry.intro} />

      <Section tone="cream">
        <StatStrip stats={industry.stats} />
      </Section>

      <Section
        tone="warm"
        title="What collections actually looks like in this trade"
        intro="The follow-up problem is shaped by how your industry sells on credit. These are the patterns we built around."
      >
        <CardGrid items={industry.painPoints} />
      </Section>

      <Section
        tone="cream"
        title={`How PraecisAI works for ${industry.name.toLowerCase()} businesses`}
        intro="One AI calling agent working your whole outstanding list, on the schedule and escalation ladder you configure."
      >
        <CardGrid items={industry.howItHelps} />
      </Section>

      {caseStudy && (
        <Section tone="warm">
          <figure className="rounded-2xl border border-[var(--caramel)] bg-[var(--cream)] p-6 sm:p-9">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <IconStarFilled key={i} size={14} className="text-[var(--rust)]" />
                ))}
              </div>
              <IconQuote size={24} className="text-[var(--mahogany)]" stroke={1.5} />
            </div>
            <blockquote className="font-body text-[15px] leading-[1.8] text-[var(--dark-brown)] sm:text-[17px]">
              &ldquo;{caseStudy.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(221,184,146,0.5)] pt-5">
              <div>
                <p className="font-display text-[14px] font-semibold text-[var(--dark-brown)]">
                  {caseStudy.person}
                </p>
                <p className="font-body text-[12px] text-[var(--walnut)]">
                  {caseStudy.company}, {caseStudy.location}
                </p>
              </div>
              <Link
                href={`/case-studies/${caseStudy.slug}`}
                className="font-body text-[13px] font-semibold text-[var(--mahogany)] underline underline-offset-4 transition-colors hover:text-[var(--rust)]"
              >
                Read the full case study
              </Link>
            </figcaption>
          </figure>
        </Section>
      )}

      <Section tone="cream" title="Questions from this industry">
        <FaqList faqs={industry.faqs} />
      </Section>

      <Section tone="warm" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: 'How it works',
              href: '/how-it-works',
              description: 'The four automated steps from outstanding data to recovered cash.',
            },
            {
              label: 'Pricing',
              href: '/pricing',
              description: '₹5,000 per month platform fee, published openly. No sales call needed.',
            },
            ...others.map((other) => ({
              label: other.name,
              href: `/industries/${other.slug}`,
              description: other.metaDescription.split('.')[0] + '.',
            })),
          ]}
        />
      </Section>

      <CtaBand
        heading={`See PraecisAI working on a ${industry.name.toLowerCase()} ledger`}
        body="Open the live demo dashboard and watch an AI call, a WhatsApp reminder and a branded statement go out."
      />
    </MarketingPage>
  );
}
