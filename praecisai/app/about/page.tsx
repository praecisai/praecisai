import type { Metadata } from 'next';
import { IconMapPin, IconQuote } from '@tabler/icons-react';
import MarketingPage from '../components/marketing/MarketingPage';
import { PageHero, Section, CtaBand, RelatedLinks } from '../components/marketing/blocks';

export const metadata: Metadata = {
  title: { absolute: 'About PraecisAI: Built by an Indian MSME Owner' },
  description:
    'PraecisAI was built by a business owner who spent years chasing his own outstanding payments. Made in India for Indian MSMEs selling on credit.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <MarketingPage crumbs={[{ label: 'About', href: '/about' }]}>
      <PageHero
        eyebrow="About"
        title="Built by Someone Who Lived the Problem"
        lead="PraecisAI is an AI calling agent for payment and credit recovery, and it exists because its founder needed one. Ravi Prajapati runs Element Clothing. For years, chasing outstanding payments from his own B2B customers was a daily grind: endless calls, reminders that got forgotten, promises that quietly slipped through."
      />

      <Section tone="cream">
        <div className="mx-auto max-w-3xl">
          <p className="font-body text-[14px] leading-[1.85] text-[var(--walnut)] sm:text-[15.5px]">
            The pattern was always the same. The largest accounts got called because they were the
            ones you remembered. The long tail did not, and that was where the money quietly aged
            past the point where anyone could recover it. Hiring another person for the accounts
            desk fixed it for a few months, until volumes grew again.
          </p>
          <p className="mt-4 font-body text-[14px] leading-[1.85] text-[var(--walnut)] sm:text-[15.5px]">
            PraecisAI was built to solve that problem properly: not a dialler running a script, but
            a system that remembers every conversation, respects the grace period you would have
            given that customer yourself, and hands the call to a human the moment it stops being
            routine. It was built for one business first, and it now runs for other Indian business
            owners with the same problem.
          </p>

          <figure className="mt-8 rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-6 sm:p-8">
            <IconQuote size={26} className="mb-4 text-[var(--mahogany)]" stroke={1.5} />
            <blockquote className="font-body text-[15px] italic leading-[1.8] text-[var(--dark-brown)] sm:text-[17px]">
              &ldquo;I run Element Clothing. Chasing outstanding payments from my own customers,
              daily calls, endless reminders, promises that still slipped through, was a problem I
              lived with for years. PraecisAI is what I built to solve it for myself, and now for
              other business owners like me.&rdquo;
            </blockquote>
            <figcaption className="mt-5 font-body text-[13px] text-[var(--walnut)]">
              <span className="font-semibold text-[var(--mahogany)]">Ravi Prajapati</span>
              {' · '}Founder &amp; CEO, PraecisAI
            </figcaption>
          </figure>
        </div>
      </Section>

      <Section tone="warm" title="Who we build for">
        <div className="mx-auto max-w-3xl">
          <p className="font-body text-[14px] leading-[1.85] text-[var(--walnut)] sm:text-[15.5px]">
            PraecisAI is made in India, for Indian MSMEs: textile, pharma, hardware and distribution
            businesses that sell on credit and deserve to get paid on time. These are businesses
            where the outstanding ledger is measured in hundreds of parties rather than dozens, and
            where the accounts team is two or three people, not a department.
          </p>
          <p className="mt-4 font-body text-[14px] leading-[1.85] text-[var(--walnut)] sm:text-[15.5px]">
            That focus shapes the product. Calls run in conversational Hindi and English because
            that is how business actually gets discussed. Ageing is calculated per bill with credit
            notes netted off because that is how a Tally ledger reads. Escalation is configurable
            because a fifteen-year relationship and a six-month-old account are not the same
            conversation.
          </p>
          <div className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-[var(--caramel)] bg-[var(--cream)] px-5 py-2.5">
            <IconMapPin size={18} className="text-[var(--mahogany)]" stroke={1.5} />
            <span className="font-body text-[13px] font-semibold text-[var(--mahogany)]">
              Mumbai, India · Data never leaves India
            </span>
          </div>
        </div>
      </Section>

      <Section tone="cream" title="Keep reading">
        <RelatedLinks
          links={[
            {
              label: 'Case studies',
              href: '/case-studies',
              description: 'What other Indian businesses reported after switching.',
            },
            {
              label: 'How it works',
              href: '/how-it-works',
              description: 'The four automated steps, in detail.',
            },
            {
              label: 'Industries',
              href: '/industries',
              description: 'Textile, pharma and hardware specifics.',
            },
          ]}
        />
      </Section>

      <CtaBand />
    </MarketingPage>
  );
}
