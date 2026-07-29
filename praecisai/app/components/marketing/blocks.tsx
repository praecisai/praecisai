import Link from 'next/link';
import { IconArrowRight, IconCheck, IconShieldLock, IconMapPin, IconBolt } from '@tabler/icons-react';

/** Page header: eyebrow, H1, and lead paragraph carrying the primary keyword. */
export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <section className="border-b border-[rgba(221,184,146,0.28)] bg-[var(--surface-warm)] px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rust)]">
          {eyebrow}
        </p>
        <h1
          className="mt-4 font-display font-bold leading-[1.14] tracking-[-0.02em] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4.2vw, 2.9rem)' }}
        >
          {title}
        </h1>
        <p className="mt-5 font-body text-[15px] leading-[1.8] text-[var(--walnut)] sm:text-[17px]">
          {lead}
        </p>
      </div>
    </section>
  );
}

export function Section({
  title,
  intro,
  children,
  tone = 'cream',
}: {
  title?: string;
  intro?: string;
  children: React.ReactNode;
  tone?: 'cream' | 'warm';
}) {
  return (
    <section
      className={`px-5 py-14 sm:px-8 sm:py-20 ${
        tone === 'warm'
          ? 'border-y border-[rgba(221,184,146,0.28)] bg-[var(--surface-warm)]'
          : 'bg-[var(--cream)]'
      }`}
    >
      <div className="mx-auto max-w-5xl">
        {title && (
          <h2
            className="font-display font-semibold leading-[1.2] text-[var(--dark-brown)]"
            style={{ fontSize: 'clamp(1.4rem, 3.2vw, 2.1rem)' }}
          >
            {title}
          </h2>
        )}
        {intro && (
          <p className="mt-3.5 max-w-3xl font-body text-[14px] leading-[1.8] text-[var(--walnut)] sm:text-[15.5px]">
            {intro}
          </p>
        )}
        <div className={title || intro ? 'mt-8 sm:mt-10' : ''}>{children}</div>
      </div>
    </section>
  );
}

/** Two-column card grid used for pain points and capability lists. */
export function CardGrid({
  items,
  numbered = false,
}: {
  items: { title: string; body: string }[];
  numbered?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
      {items.map((item, i) => (
        <div
          key={item.title}
          className="rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-5 sm:p-7"
        >
          {numbered ? (
            <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--mahogany)] font-display text-[13px] font-bold text-[var(--cream)]">
              {String(i + 1).padStart(2, '0')}
            </span>
          ) : (
            <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--mahogany)]">
              <IconCheck size={17} stroke={2.4} />
            </span>
          )}
          <h3 className="font-display text-[15px] font-semibold leading-snug text-[var(--dark-brown)] sm:text-[17px]">
            {item.title}
          </h3>
          <p className="mt-2.5 font-body text-[13px] leading-[1.75] text-[var(--walnut)] sm:text-[14px]">
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function StatStrip({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-[var(--caramel)] bg-[var(--cream)] px-5 py-5 text-center"
        >
          <p className="font-display text-[20px] font-bold text-[var(--mahogany)] sm:text-[24px]">
            {stat.value}
          </p>
          <p className="mt-1 font-body text-[12px] leading-snug text-[var(--walnut)] sm:text-[13px]">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Static, crawlable FAQ list. Answers are always in the HTML. */
export function FaqList({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <dl className="overflow-hidden rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)]">
      {faqs.map((faq) => (
        <div
          key={faq.question}
          className="border-b border-[var(--caramel)] px-5 py-5 last:border-b-0 sm:px-7 sm:py-6"
        >
          <dt className="font-display text-[14px] font-semibold text-[var(--dark-brown)] sm:text-[15px]">
            {faq.question}
          </dt>
          <dd className="mt-2 font-body text-[13px] leading-[1.75] text-[var(--walnut)] sm:text-[14px]">
            {faq.answer}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const trustSignals = [
  { icon: IconShieldLock, text: 'Bank-grade security' },
  { icon: IconMapPin, text: 'Data never leaves India' },
  { icon: IconBolt, text: 'Live in 10 minutes' },
];

/** One primary CTA per page, per the blueprint's journey map. */
export function CtaBand({
  heading = 'See PraecisAI recover a payment, live',
  body = 'Watch an AI voice call, a WhatsApp reminder and a branded statement go out on a real dashboard.',
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <section className="bg-[#0F0A06] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2
          className="font-display font-bold leading-[1.15] text-[#FDF8F3]"
          style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2.25rem)' }}
        >
          {heading}
        </h2>
        <p className="mx-auto mt-4 max-w-lg font-body text-[14px] leading-[1.75] text-[var(--walnut)] sm:text-[15px]">
          {body}
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/#demo"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--rust)] px-7 py-4 font-display text-[15px] font-semibold text-[var(--cream)] shadow-[0_4px_20px_rgba(156,102,68,0.35)] transition-all duration-200 hover:bg-[var(--mahogany)]"
          >
            See Live Demo
            <IconArrowRight
              size={16}
              stroke={2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {trustSignals.map((signal) => (
            <span
              key={signal.text}
              className="inline-flex items-center gap-1.5 font-body text-[12px] font-medium text-[var(--walnut)]"
            >
              <signal.icon size={14} stroke={1.9} />
              {signal.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Contextual internal links. Every page carries at least two. */
export function RelatedLinks({
  links,
}: {
  links: { label: string; href: string; description: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="group rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-5 py-4 transition-colors hover:border-[var(--mahogany)]"
        >
          <p className="flex items-center gap-1.5 font-display text-[14px] font-semibold text-[var(--mahogany)]">
            {link.label}
            <IconArrowRight
              size={14}
              stroke={2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </p>
          <p className="mt-1 font-body text-[12.5px] leading-[1.65] text-[var(--walnut)]">
            {link.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
