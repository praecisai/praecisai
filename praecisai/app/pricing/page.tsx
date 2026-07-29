import type { Metadata } from 'next';
import { IconCheck, IconShieldCheck, IconInfoCircle } from '@tabler/icons-react';
import MarketingPage, { SITE_URL } from '../components/marketing/MarketingPage';
import { PageHero, Section, FaqList, CtaBand, RelatedLinks } from '../components/marketing/blocks';

export const metadata: Metadata = {
  title: { absolute: 'Pricing: AI Collections Agent from ₹5,000/mo' },
  description:
    'AI collections agent pricing in India. ₹5,000 per month platform fee, ₹50,000 one-time setup, usage-based WhatsApp and calling. No lock-in contracts.',
  alternates: { canonical: '/pricing' },
};

const platformFeatures = [
  'Unlimited debtor parties',
  'Four-stage smart AI segmentation',
  'Branded PDF statement generation',
  'Promise-to-pay tracker',
  'Five weekly owner and team reports',
  'Live recovery dashboard',
  'Import any Excel or CSV format',
  'Dedicated onboarding support',
];

const setupIncludes = [
  'Full platform setup and configuration',
  'Data migration and Excel import setup',
  'Custom workflow and stage configuration',
  'Team training and onboarding sessions',
  'WhatsApp Business API integration',
  'AI voice call system setup',
  '7-day post-launch hand-holding support',
];

const addOns = [
  {
    title: 'WhatsApp messaging',
    subtitle: 'Per message or campaign',
    body: 'Automated reminders, payment links and PDF statements delivered to your parties. You pay only for what actually goes out.',
  },
  {
    title: 'AI voice calls',
    subtitle: 'Per call or minute',
    body: 'Hindi and English AI voice calls that follow up on outstanding dues. Human-sounding, fully automated, running only in the windows you allow.',
  },
];

const faqs = [
  {
    question: 'What does PraecisAI cost?',
    answer:
      '₹5,000 per month as the platform fee, plus a one-time ₹50,000 setup fee. WhatsApp messaging and AI voice calls are billed on usage, at rates shared during onboarding.',
  },
  {
    question: 'Is there a contract or lock-in?',
    answer:
      'No lock-in. The platform fee is billed monthly and you can cancel anytime from your dashboard.',
  },
  {
    question: 'Why is there a one-time setup fee?',
    answer:
      'Setup covers configuration, data migration, workflow and stage setup, WhatsApp Business API integration, AI call system setup, team training and a week of post-launch support. It is paid once, after which only the monthly platform fee applies.',
  },
  {
    question: 'Does the price change with the number of parties?',
    answer:
      'No. The platform fee covers unlimited debtor parties. Only the usage-based messaging and calling scale with volume.',
  },
  {
    question: 'Do we need a sales call to get pricing?',
    answer:
      'No. The pricing on this page is the pricing. A call is only useful for scoping an integration or discussing usage rates.',
  },
];

export default function PricingPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PraecisAI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${SITE_URL}/pricing`,
    offers: [
      {
        '@type': 'Offer',
        name: 'Monthly platform',
        price: '5000',
        priceCurrency: 'INR',
        priceValidUntil: '2027-12-31',
        url: `${SITE_URL}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'One-time setup',
        price: '50000',
        priceCurrency: 'INR',
        priceValidUntil: '2027-12-31',
        url: `${SITE_URL}/pricing`,
      },
    ],
  };

  return (
    <MarketingPage crumbs={[{ label: 'Pricing', href: '/pricing' }]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([productJsonLd, faqJsonLd]) }}
      />

      <PageHero
        eyebrow="Pricing"
        title="AI Collections Agent Pricing in India"
        lead="AI collections agent pricing should not require a sales call to discover. PraecisAI is ₹5,000 per month for the platform, plus a one-time ₹50,000 setup fee, with WhatsApp messaging and AI voice calls billed on usage. No lock-in, no per-party pricing, no surprises on the invoice."
      />

      <Section tone="cream">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border-2 border-[var(--mahogany)] bg-[var(--surface-warm)] p-6 shadow-[0_8px_40px_rgba(127,85,57,0.1)] sm:p-9">
            <span className="self-start rounded-full bg-[var(--mahogany)] px-3.5 py-1 font-body text-[10px] font-semibold uppercase tracking-widest text-[var(--cream)]">
              Monthly platform
            </span>
            <p className="mt-5 font-display text-[38px] font-bold leading-none text-[var(--dark-brown)] sm:text-[48px]">
              ₹5,000
              <span className="font-body text-[15px] font-normal text-[var(--walnut)]"> / month</span>
            </p>
            <p className="mt-2 font-body text-[12.5px] text-[var(--walnut)]">
              Billed monthly · Cancel anytime
            </p>
            <div className="my-6 h-px bg-[var(--caramel)]/40" />
            <p className="mb-3 font-body text-[11px] font-semibold uppercase tracking-wider text-[var(--rust)]">
              Everything included
            </p>
            <ul className="flex flex-col gap-2.5">
              {platformFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--mahogany)]">
                    <IconCheck size={9} className="text-[var(--cream)]" stroke={3} />
                  </span>
                  <span className="font-body text-[13px] leading-snug text-[var(--dark-brown)]">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-6 sm:p-9">
            <span className="self-start rounded-full bg-[var(--caramel)] px-3.5 py-1 font-body text-[10px] font-semibold uppercase tracking-widest text-[var(--dark-brown)]">
              One-time setup
            </span>
            <p className="mt-5 font-display text-[38px] font-bold leading-none text-[var(--dark-brown)] sm:text-[48px]">
              ₹50,000
              <span className="font-body text-[15px] font-normal text-[var(--walnut)]"> one-time</span>
            </p>
            <p className="mt-2 font-body text-[12.5px] text-[var(--walnut)]">
              Paid once · Lifetime access to setup
            </p>
            <div className="my-6 h-px bg-[var(--caramel)]/40" />
            <p className="mb-3 font-body text-[11px] font-semibold uppercase tracking-wider text-[var(--rust)]">
              What&rsquo;s included
            </p>
            <ul className="flex flex-col gap-2.5">
              {setupIncludes.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--caramel)] bg-[var(--sand)]">
                    <IconCheck size={9} className="text-[var(--mahogany)]" stroke={3} />
                  </span>
                  <span className="font-body text-[13px] leading-snug text-[var(--dark-brown)]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex-1" />
            <div className="mt-7 flex items-start gap-2.5 rounded-xl bg-[var(--sand)] px-4 py-3.5">
              <IconShieldCheck
                size={16}
                className="mt-0.5 shrink-0 text-[var(--mahogany)]"
                stroke={1.75}
              />
              <p className="font-body text-[12.5px] leading-relaxed text-[var(--dark-brown)]/80">
                Once the setup fee is paid, only the monthly platform fee applies going forward.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-body text-[13px] font-medium text-[var(--mahogany)]">
          Yes, we show our pricing. No sales calls required to find out what this costs.
        </p>
      </Section>

      <Section
        tone="warm"
        title="Usage-based add-ons"
        intro="Messaging and calling are billed on what you actually send, so a quiet month costs less than a heavy one."
      >
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {addOns.map((addOn) => (
            <div
              key={addOn.title}
              className="rounded-2xl border border-[var(--caramel)] bg-[var(--cream)] p-5 sm:p-7"
            >
              <p className="font-display text-[15px] font-semibold text-[var(--dark-brown)] sm:text-[17px]">
                {addOn.title}
              </p>
              <p className="mt-0.5 font-body text-[12px] text-[var(--walnut)]">{addOn.subtitle}</p>
              <p className="mt-3 font-body text-[13px] leading-[1.75] text-[var(--walnut)] sm:text-[14px]">
                {addOn.body}
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--sand)] px-3.5 py-2.5">
                <IconInfoCircle size={13} className="shrink-0 text-[var(--mahogany)]" stroke={2} />
                <p className="font-body text-[12px] text-[var(--dark-brown)]/75">
                  Rates shared during onboarding
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="cream" title="Pricing questions">
        <FaqList faqs={faqs} />
      </Section>

      <Section tone="warm" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: 'Features',
              href: '/features',
              description: 'Exactly what the platform fee covers.',
            },
            {
              label: 'How it works',
              href: '/how-it-works',
              description: 'The four automated steps, in detail.',
            },
            {
              label: 'Case studies',
              href: '/case-studies',
              description: 'What businesses reported after switching.',
            },
          ]}
        />
      </Section>

      <CtaBand
        heading="See what ₹5,000 a month actually does"
        body="Open the live demo dashboard and watch an AI call, a WhatsApp reminder and a branded statement go out."
      />
    </MarketingPage>
  );
}
