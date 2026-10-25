'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  IconCheck,
  IconArrowRight,
  IconShieldCheck,
  IconBrandWhatsapp,
  IconPhone,
  IconInfoCircle,
} from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';
import AnimatedHeading from './AnimatedHeading';
import { handleAnchorClick } from '@/lib/utils/scroll-to-section';

function scrollToDemo(e: React.MouseEvent) {
  handleAnchorClick(e, 'demo');
}

const platformFeatures = [
  'Unlimited debtor parties',
  'Smart AI segmentation',
  'PDF statements generation',
  'Promise-to-pay tracker',
  'Owner weekly digest report',
  'Live recovery dashboard',
  'Import any Excel format',
  'Dedicated onboarding support',
];

// Paid trials. Amounts mirror TRIAL_PLANS in the backend's billing-math.util.ts;
// the server is the source of truth for what is actually charged.
const trialPlans = [
  { price: '₹5,000', days: 15, note: 'Best value', featured: true },
  { price: '₹10,000', days: 10, note: 'Shorter run', featured: false },
];

// Included free on both plans (there is no setup fee any more).
const setupIncluded = [
  'Full platform setup & configuration',
  'Data migration & Excel import setup',
  'WhatsApp Business API integration',
  'AI voice call system setup',
  'Team training & onboarding sessions',
  '7-day post-launch hand-holding support',
];

const addOnCards = [
  {
    icon: IconPhone,
    title: 'AI Voice Calls',
    subtitle: 'Charged per call',
    description:
      'Human-sounding Hindi and English calls that follow up on dues for you. You pay only for the calls that actually go out: no minimum, no prepaid pack.',
    note: 'Every call, its duration and cost is listed in your Billing & Usage page',
  },
  {
    icon: IconBrandWhatsapp,
    title: 'WhatsApp Messages',
    subtitle: 'Charged per message',
    description:
      'Reminders and PDF statements sent straight to your parties on WhatsApp. You pay only for the messages that are sent: nothing when it is quiet.',
    note: 'Exact per-call and per-message rates are shared before you start',
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-[var(--cream)] px-4 py-16 sm:px-8 sm:py-36 text-center">
      <motion.div
        className="mx-auto w-full max-w-5xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Label */}
        <motion.p
          variants={itemVariants}
          className="mb-3 text-center font-body text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rust)]"
        >
          Pricing
        </motion.p>

        {/* Heading */}
        <AnimatedHeading
          text="Simple, transparent pricing"
          className="text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.4rem, 4vw, 2.625rem)' }}
        />
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-3 sm:mt-5 max-w-lg text-center font-body text-[13px] sm:text-[15px] leading-relaxed text-[var(--walnut)]"
        >
          One simple platform fee, zero setup cost. Calls and WhatsApp messages are pay as you go.
        </motion.p>
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-2.5 sm:mt-3.5 max-w-lg text-center font-body text-[12px] sm:text-[13px] font-medium text-[var(--mahogany)]"
        >
          Yes, we show our pricing. No sales calls required to find out what this costs.
        </motion.p>

        {/* ── Paid trials: try the platform before the full onboarding ── */}
        <motion.div variants={itemVariants} className="mt-8 sm:mt-12">
          <p className="mb-3 text-center font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-[var(--rust)]">
            Start with a paid trial
          </p>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 min-[420px]:grid-cols-2">
            {trialPlans.map((t) => (
              <div
                key={t.days}
                className={`relative flex flex-col items-center rounded-2xl border bg-[var(--surface-warm)] px-4 py-4 sm:px-6 sm:py-5 ${
                  t.featured
                    ? 'border-[var(--mahogany)] shadow-[0_6px_28px_rgba(127,85,57,0.12)]'
                    : 'border-[var(--caramel)]/60'
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-2.5 rounded-full bg-[var(--mahogany)] px-2.5 py-0.5 font-body text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--cream)] whitespace-nowrap">
                    {t.note}
                  </span>
                )}
                <p className="font-display text-[24px] sm:text-[30px] font-bold leading-none text-[var(--dark-brown)]">
                  {t.price}
                </p>
                <p className="mt-1 font-body text-[12px] sm:text-[13px] font-semibold text-[var(--mahogany)]">
                  {t.days} days of full access
                </p>
                <p className="mt-1 text-center font-body text-[10.5px] sm:text-[11.5px] leading-snug text-[var(--walnut)]">
                  One-time · adjusted against the yearly plan if you continue
                </p>
                {/* Visitors are logged out here: sign-up leads straight to the
                    plans screen where the trial is actually purchased. */}
                <Link
                  href="/signup"
                  className={`mt-3 w-full rounded-xl px-4 py-2.5 text-center font-display text-[13px] sm:text-[14px] font-semibold transition-colors ${
                    t.featured
                      ? 'bg-[var(--mahogany)] text-[var(--cream)] hover:bg-[var(--rust)]'
                      : 'border border-[var(--caramel)] text-[var(--mahogany)] hover:bg-[var(--sand)]'
                  }`}
                >
                  Start {t.days}-day trial
                </Link>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Main pricing cards row ── */}
        <motion.div
          variants={itemVariants}
          className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 md:grid-cols-2"
        >
          {/* ── Card 1: Monthly ── */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--mahogany)] bg-[var(--surface-warm)] shadow-[0_8px_40px_rgba(127,85,57,0.12)]">
            {/* Badge */}
            <div className="absolute inset-x-0 top-0 flex justify-center">
              <span className="rounded-b-xl bg-[var(--mahogany)] px-4 py-1 font-body text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-[var(--cream)]">
                Monthly Platform
              </span>
            </div>

            <div className="flex flex-1 flex-col px-5 pb-6 pt-10 sm:px-10 sm:pb-8 sm:pt-14">
              {/* Price */}
              <div className="mb-2 text-center">
                <p className="font-display text-[38px] sm:text-[56px] font-bold leading-none text-[var(--dark-brown)]">
                  ₹5,000
                  <span className="font-body text-[14px] sm:text-[18px] font-normal text-[var(--walnut)]">
                    {' '}/ month
                  </span>
                </p>
                <p className="mt-1.5 sm:mt-2.5 inline-flex items-center rounded-full bg-[var(--sand)] px-3 py-1 font-body text-[11px] sm:text-[12px] font-semibold text-[var(--mahogany)]">
                  ₹0 setup cost
                </p>
                <p className="mt-1 sm:mt-2 font-body text-[12px] sm:text-[13px] text-[var(--walnut)]">
                  Billed monthly · Cancel anytime
                </p>
              </div>

              {/* Divider */}
              <div className="my-4 sm:my-6 h-px bg-[var(--caramel)]/30" />

              {/* Features */}
              <p className="mb-3 text-left font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider text-[var(--rust)]">
                Everything included
              </p>
              <ul className="flex flex-col gap-2 sm:gap-3">
                {platformFeatures.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--mahogany)]">
                      <IconCheck size={9} className="text-[var(--cream)]" stroke={3} />
                    </div>
                    <span className="font-body text-[12px] sm:text-[13.5px] leading-snug text-[var(--dark-brown)]">
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Spacer */}
              <div className="flex-1" />

              {/* CTA */}
              <div className="mt-6 sm:mt-8">
                <button
                  onClick={scrollToDemo}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--mahogany)] px-5 py-3 sm:px-6 sm:py-4 font-display text-[13px] sm:text-[15px] font-semibold text-[var(--cream)] shadow-[0_4px_20px_rgba(127,85,57,0.3)] transition-all duration-200 hover:bg-[var(--rust)] hover:shadow-[0_6px_28px_rgba(156,102,68,0.35)]"
                >
                  See Live Demo
                  <IconArrowRight size={16} stroke={2} />
                </button>
                <p className="mt-2 sm:mt-3 text-center font-body text-[11px] sm:text-[12px] text-[var(--walnut)]">
                  Speak to us about onboarding · No obligation
                </p>
              </div>
            </div>
          </div>

          {/* ── Card 2: Yearly ── */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--caramel)]/60 bg-[var(--surface-warm)] shadow-[0_8px_40px_rgba(127,85,57,0.07)]">
            {/* Badge */}
            <div className="absolute inset-x-0 top-0 flex justify-center">
              <span className="rounded-b-xl bg-[var(--caramel)] px-4 py-1 font-body text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-[var(--dark-brown)]">
                Yearly · Best value
              </span>
            </div>

            <div className="flex flex-1 flex-col px-5 pb-6 pt-10 sm:px-10 sm:pb-8 sm:pt-14">
              {/* Price */}
              <div className="mb-2 text-center">
                <p className="font-display text-[38px] sm:text-[56px] font-bold leading-none text-[var(--dark-brown)]">
                  <span className="mr-2 align-middle font-body text-[20px] sm:text-[28px] font-semibold text-[var(--walnut)] line-through">
                    ₹60,000
                  </span>
                  ₹40,000
                  <span className="font-body text-[14px] sm:text-[18px] font-normal text-[var(--walnut)]">
                    {' '}/ year
                  </span>
                </p>
                <p className="mt-1.5 sm:mt-2.5 inline-flex items-center rounded-full bg-[var(--mahogany)] px-3 py-1 font-body text-[11px] sm:text-[12px] font-semibold text-[var(--cream)]">
                  Save ₹20,000 · ₹0 setup cost
                </p>
                <p className="mt-1 sm:mt-2 font-body text-[12px] sm:text-[13px] text-[var(--walnut)]">
                  Billed once a year · Works out to about ₹3,333 / month
                </p>
              </div>

              {/* Divider */}
              <div className="my-4 sm:my-6 h-px bg-[var(--caramel)]/30" />

              {/* What's included */}
              <p className="mb-3 text-left font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider text-[var(--rust)]">
                Everything in Monthly, plus free setup
              </p>
              <ul className="flex flex-col gap-2 sm:gap-3">
                {setupIncluded.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--caramel)] bg-[var(--sand)]">
                      <IconCheck size={9} className="text-[var(--mahogany)]" stroke={3} />
                    </div>
                    <span className="font-body text-[12px] sm:text-[13.5px] leading-snug text-[var(--dark-brown)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Note */}
              <div className="mt-6 sm:mt-8 flex items-start gap-2.5 rounded-xl bg-[var(--sand)] px-4 py-3 sm:px-5 sm:py-4">
                <IconShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--mahogany)]" stroke={1.75} />
                <p className="font-body text-[11px] sm:text-[13px] leading-relaxed text-[var(--dark-brown)]/80">
                  No setup fee on any plan. Pay once for the year and get 12 months of the full platform for the price of 8.
                </p>
              </div>

              {/* CTA, matching the monthly card so both columns end the same way */}
              <div className="mt-4 sm:mt-5">
                <Link
                  href="/signup"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--caramel)] px-5 py-3 font-display text-[13px] font-semibold text-[var(--mahogany)] transition-all duration-200 hover:border-[var(--walnut)] hover:bg-[var(--sand)] sm:px-6 sm:py-4 sm:text-[15px]"
                >
                  Get started
                  <IconArrowRight size={16} stroke={2} />
                </Link>
                <p className="mt-2 sm:mt-3 text-center font-body text-[11px] sm:text-[12px] text-[var(--walnut)]">
                  Create your account · pick a plan after sign-up
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Add-ons: WhatsApp + Calling ── */}
        <motion.div variants={itemVariants} className="mt-5 sm:mt-8">
          <p className="mb-4 text-center font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-[var(--rust)]">
            Pay as you go: calls &amp; WhatsApp
          </p>
          <p className="mx-auto mb-5 max-w-xl text-center font-body text-[12px] sm:text-[13.5px] leading-relaxed text-[var(--walnut)]">
            Calls and WhatsApp messages are not part of the platform fee. They are charged separately,
            only for what you actually use, so a quiet month costs you less.
          </p>
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            {addOnCards.map(({ icon: Icon, title, subtitle, description, note }) => (
              <div
                key={title}
                className="flex flex-col gap-3 sm:gap-4 rounded-2xl border border-[var(--caramel)]/50 bg-[var(--surface-warm)] px-5 py-4 sm:px-7 sm:py-6 text-left shadow-[0_4px_20px_rgba(127,85,57,0.07)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--mahogany)]/10">
                    <Icon size={17} className="text-[var(--mahogany)]" stroke={1.75} />
                  </div>
                  <div>
                    <p className="font-display text-[13px] sm:text-[15px] font-semibold text-[var(--dark-brown)]">
                      {title}
                    </p>
                    <p className="font-body text-[11px] sm:text-[12px] text-[var(--walnut)]">{subtitle}</p>
                  </div>
                </div>
                <p className="font-body text-[12px] sm:text-[13.5px] leading-relaxed text-[var(--walnut)]">
                  {description}
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--sand)] px-3 py-2 sm:px-4 sm:py-2.5">
                  <IconInfoCircle size={13} className="shrink-0 text-[var(--mahogany)]" stroke={2} />
                  <p className="font-body text-[11px] sm:text-[12px] text-[var(--dark-brown)]/70">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Bottom trust note ── */}
        <motion.div
          variants={itemVariants}
          className="mt-6 sm:mt-8 flex items-center justify-center gap-2 text-center"
        >
          <IconShieldCheck size={14} className="text-[var(--mahogany)]" stroke={1.75} />
          <p className="font-body text-[12px] sm:text-[13px] text-[var(--walnut)]">
            No hidden charges. No lock-in contracts. Transparent billing always.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
