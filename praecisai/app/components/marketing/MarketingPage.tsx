import Link from 'next/link';
import { IconChevronRight } from '@tabler/icons-react';
import MarketingNav from './MarketingNav';
import WhatsAppWidget from './WhatsAppWidget';
import Footer from '../landing/Footer';

export const SITE_URL = 'https://www.praecisai.in';

export type Crumb = { label: string; href: string };

/**
 * Shell for every standalone marketing page: nav, breadcrumb trail
 * (with BreadcrumbList schema), content, footer and WhatsApp widget.
 */
export default function MarketingPage({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: React.ReactNode;
}) {
  const trail: Crumb[] = [{ label: 'Home', href: '/' }, ...crumbs];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      item: `${SITE_URL}${crumb.href === '/' ? '' : crumb.href}`,
    })),
  };

  return (
    <div className="landing-page min-h-screen bg-[var(--cream)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <MarketingNav />

      <nav
        aria-label="Breadcrumb"
        className="border-b border-[rgba(221,184,146,0.28)] bg-[var(--surface-warm)]"
      >
        <ol className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-5 py-3 sm:px-8">
          {trail.map((crumb, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1">
                {i > 0 && (
                  <IconChevronRight
                    size={13}
                    stroke={2}
                    className="text-[var(--walnut)]/60"
                    aria-hidden
                  />
                )}
                {last ? (
                  <span
                    aria-current="page"
                    className="font-body text-[12px] font-medium text-[var(--dark-brown)]"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="font-body text-[12px] text-[var(--walnut)] transition-colors hover:text-[var(--mahogany)]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <main>{children}</main>

      <Footer />
      <WhatsAppWidget />
    </div>
  );
}
