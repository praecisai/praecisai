import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingPage from './components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: { absolute: 'Page not found | PraecisAI' },
  description:
    'That page does not exist. Browse PraecisAI pricing, how it works, industries and FAQs for AI-powered payment recovery.',
  robots: { index: false, follow: true },
};

/** Routes worth offering someone who landed on a dead link. */
const DESTINATIONS = [
  { href: '/', label: 'Homepage', blurb: 'What PraecisAI does and how it recovers your dues' },
  { href: '/how-it-works', label: 'How it works', blurb: 'The four steps from Excel upload to recovered cash' },
  { href: '/pricing', label: 'Pricing', blurb: 'Plans, trials and the one-time onboarding fee' },
  { href: '/industries', label: 'Industries', blurb: 'Textile, pharma and hardware credit cycles' },
  { href: '/faq', label: 'FAQ', blurb: 'Data security, disputes and how customers react' },
  { href: '/case-studies', label: 'Case studies', blurb: 'Real recovery outcomes from Indian businesses' },
];

export default function NotFound() {
  return (
    <MarketingPage crumbs={[{ label: 'Page not found', href: '/404' }]}>
      <section className="border-b border-[rgba(221,184,146,0.28)] bg-[var(--surface-warm)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rust)]">
            404
          </p>
          <h1 className="mt-4 font-display text-[1.5rem] font-bold leading-[1.14] tracking-[-0.02em] text-[var(--dark-brown)] sm:text-[clamp(1.75rem,4.2vw,2.9rem)]">
            We could not find that page
          </h1>
          <p className="mt-5 font-body text-[15px] leading-[1.8] text-[var(--walnut)] sm:text-[17px]">
            The link may be out of date or mistyped. Everything on PraecisAI is still here: pick a
            starting point below, or head back to the homepage.
          </p>
        </div>
      </section>

      <section className="bg-[var(--cream)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 sm:gap-4">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="flex flex-col rounded-2xl border border-[var(--caramel)]/60 bg-[var(--surface-warm)] px-5 py-4 transition-colors hover:border-[var(--mahogany)] sm:px-6 sm:py-5"
            >
              <span className="font-display text-[15px] font-semibold text-[var(--dark-brown)] sm:text-[16px]">
                {d.label}
              </span>
              <span className="mt-1 font-body text-[12.5px] leading-snug text-[var(--walnut)] sm:text-[13.5px]">
                {d.blurb}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </MarketingPage>
  );
}
