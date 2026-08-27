import type { Metadata } from 'next';
import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import MarketingPage from '../components/marketing/MarketingPage';
import { PageHero, Section, CtaBand } from '../components/marketing/blocks';
import { getBlogPosts } from '@/lib/content/blog';

export const metadata: Metadata = {
  title: { absolute: 'PraecisAI Blog | B2B Payment Recovery Insights' },
  description:
    'Insights, guides and best practices for accounts receivable and B2B payment recovery in India.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndexPage() {
  const posts = getBlogPosts();

  return (
    <MarketingPage crumbs={[{ label: 'Blog', href: '/blog' }]}>
      <PageHero
        eyebrow="Blog"
        title="B2B Payment Recovery Insights"
        lead="Guides, benchmarks and best practices for managing accounts receivable in Indian B2B trade. From reducing DSO to implementing AI automation."
      />

      <Section tone="cream">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-6 transition-all duration-200 hover:border-[var(--mahogany)] hover:shadow-[0_12px_40px_rgba(127,85,57,0.12)] sm:p-8"
            >
              <div className="mb-4 text-[12.5px] font-medium uppercase tracking-wider text-[var(--rust)]">
                {new Date(post.publishedAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <h2 className="font-display text-[17px] font-semibold leading-snug text-[var(--dark-brown)] sm:text-[19px]">
                {post.title}
              </h2>
              <p className="mt-3 flex-1 font-body text-[13px] leading-[1.75] text-[var(--walnut)] sm:text-[14px]">
                {post.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-body text-[13px] font-semibold text-[var(--mahogany)]">
                Read article
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
