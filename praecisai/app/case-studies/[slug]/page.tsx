import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IconQuote, IconTrendingUp } from '@tabler/icons-react';
import MarketingPage, { SITE_URL } from '../../components/marketing/MarketingPage';
import { PageHero, Section, CtaBand, RelatedLinks } from '../../components/marketing/blocks';
import { caseStudies, getCaseStudy } from '@/lib/content/case-studies';

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return {};
  return {
    title: { absolute: study.metaTitle },
    description: study.metaDescription,
    alternates: { canonical: `/case-studies/${study.slug}` },
    openGraph: {
      title: study.metaTitle,
      description: study.metaDescription,
      url: `${SITE_URL}/case-studies/${study.slug}`,
      type: 'article',
      publishedTime: study.publishedAt,
    },
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const others = caseStudies.filter((c) => c.slug !== study.slug);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: study.h1,
    description: study.metaDescription,
    datePublished: study.publishedAt,
    dateModified: study.publishedAt,
    image: `${SITE_URL}/apple-touch-icon.png`,
    author: { '@type': 'Organization', name: 'PraecisAI', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'PraecisAI',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/apple-touch-icon.png` },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/case-studies/${study.slug}`,
    },
  };

  return (
    <MarketingPage
      crumbs={[
        { label: 'Case studies', href: '/case-studies' },
        { label: study.company, href: `/case-studies/${study.slug}` },
      ]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <PageHero
        eyebrow={`Case study · ${study.industryName}`}
        title={study.h1}
        lead={study.summary}
      />

      <Section tone="cream">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border-2 border-[var(--mahogany)] bg-[var(--surface-warm)] px-5 py-5 sm:col-span-2">
            <span className="inline-flex items-center gap-1.5 font-body text-[11px] font-semibold uppercase tracking-widest text-[var(--rust)]">
              <IconTrendingUp size={14} stroke={2} />
              Outcome
            </span>
            <p className="mt-2 font-display text-[18px] font-bold leading-snug text-[var(--dark-brown)] sm:text-[22px]">
              {study.outcome}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-5 py-5">
            <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-[var(--rust)]">
              Business
            </p>
            <p className="mt-2 font-display text-[15px] font-semibold text-[var(--dark-brown)]">
              {study.company}
            </p>
            <p className="mt-0.5 font-body text-[12.5px] text-[var(--walnut)]">
              {study.industryName} · {study.location}
            </p>
          </div>
        </div>
      </Section>

      <Section tone="warm">
        <article className="mx-auto max-w-3xl">
          {study.sections.map((section) => (
            <div key={section.heading} className="mb-9 last:mb-0">
              <h2
                className="font-display font-semibold leading-[1.25] text-[var(--dark-brown)]"
                style={{ fontSize: 'clamp(1.25rem, 2.6vw, 1.6rem)' }}
              >
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="mt-3.5 font-body text-[14px] leading-[1.85] text-[var(--walnut)] sm:text-[15.5px]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}

          <figure className="mt-10 rounded-2xl border border-[var(--caramel)] bg-[var(--cream)] p-6 sm:p-8">
            <IconQuote size={26} className="mb-4 text-[var(--mahogany)]" stroke={1.5} />
            <blockquote className="font-body text-[15px] italic leading-[1.8] text-[var(--dark-brown)] sm:text-[17px]">
              &ldquo;{study.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 font-body text-[13px] text-[var(--walnut)]">
              <span className="font-semibold text-[var(--mahogany)]">{study.person}</span>
              {' · '}
              {study.role}, {study.company}, {study.location}
            </figcaption>
          </figure>
        </article>
      </Section>

      <Section tone="cream" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: study.industryName,
              href: `/industries/${study.industrySlug}`,
              description: `How PraecisAI is configured for ${study.industryName.toLowerCase()} businesses.`,
            },
            ...others.map((other) => ({
              label: `${other.company} case study`,
              href: `/case-studies/${other.slug}`,
              description: other.outcome,
            })),
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
