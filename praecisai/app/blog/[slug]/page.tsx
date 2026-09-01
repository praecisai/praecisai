import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import MarketingPage, { SITE_URL, OG_IMAGES } from '../../components/marketing/MarketingPage';
import { getBlogPost, getBlogPosts } from '@/lib/content/blog';

export function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  
  if (!post) {
    return {};
  }

  return {
    title: { absolute: `${post.title} | PraecisAI Blog` },
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: 'article',
      images: OG_IMAGES,
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

const components = {
  h1: (props: any) => <h1 className="mt-10 mb-6 font-display text-3xl font-bold text-[var(--dark-brown)] leading-[1.2]" {...props} />,
  h2: (props: any) => <h2 className="mt-12 mb-5 font-display text-2xl font-semibold text-[var(--dark-brown)] leading-[1.2]" {...props} />,
  h3: (props: any) => <h3 className="mt-8 mb-4 font-display text-xl font-semibold text-[var(--dark-brown)]" {...props} />,
  p: (props: any) => <p className="mb-6 font-body text-[15.5px] leading-[1.8] text-[var(--walnut)]" {...props} />,
  ul: (props: any) => <ul className="mb-6 ml-6 list-outside list-disc space-y-3 font-body text-[15.5px] leading-[1.8] text-[var(--walnut)]" {...props} />,
  ol: (props: any) => <ol className="mb-6 ml-6 list-outside list-decimal space-y-3 font-body text-[15.5px] leading-[1.8] text-[var(--walnut)]" {...props} />,
  li: (props: any) => <li className="pl-1" {...props} />,
  a: (props: any) => <a className="font-semibold text-[var(--mahogany)] underline underline-offset-4 hover:text-[var(--rust)]" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-[var(--dark-brown)]" {...props} />,
  blockquote: (props: any) => (
    <blockquote className="my-8 border-l-4 border-[var(--mahogany)] bg-[var(--surface-warm)] py-4 pl-6 pr-4 italic text-[var(--dark-brown)]" {...props} />
  ),
  hr: (props: any) => <hr className="my-10 border-t border-[rgba(221,184,146,0.5)]" {...props} />,
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <MarketingPage
      crumbs={[
        { label: 'Blog', href: '/blog' },
        { label: post.title, href: `/blog/${post.slug}` },
      ]}
    >
      <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <header className="mb-12">
          <div className="mb-4 flex items-center gap-3 font-body text-[13px] font-medium text-[var(--rust)]">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span className="h-1 w-1 rounded-full bg-[rgba(221,184,146,0.8)]"></span>
            <span>{post.author}</span>
          </div>
        </header>

        <div className="prose-md prose-praecisai">
          <MDXRemote source={post.content} components={components} />
        </div>
      </article>
    </MarketingPage>
  );
}
