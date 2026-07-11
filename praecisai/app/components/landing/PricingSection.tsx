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

function scrollToDemo(e: React.MouseEvent) {
  e.preventDefault();
  const el = document.getElementById('demo');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', '#demo');
  }
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

const addOnCards = [
  {
    icon: IconBrandWhatsapp,
    title: 'WhatsApp Messaging',
    subtitle: 'Per message / campaign',
    description:
      'Automated WhatsApp reminders, payment links, and PDF statements sent directly to your debtors. Pay only for what you send.',
    note: 'Pricing shared during onboarding',
  },
  {
    icon: IconPhone,
    title: 'AI Voice Calls',
    subtitle: 'Per call / minute',
    description:
      'AI-powered Hindi voice calls that follow up on outstanding dues — human-sounding, fully automated, 24 × 7.',
    note: 'Pricing shared during onboarding',
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
          One platform fee. Usage-based messaging and calling on top. No surprises.
        </motion.p>

        {/* ── Main pricing cards row ── */}
        <motion.div
          variants={itemVariants}
          className="mt-8 sm:mt-14 grid gap-4 sm:gap-6 md:grid-cols-2"
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
                  Try Demo
                  <IconArrowRight size={16} stroke={2} />
                </button>
                <p className="mt-2 sm:mt-3 text-center font-body text-[11px] sm:text-[12px] text-[var(--walnut)]">
                  Speak to us about onboarding · No obligation
                </p>
              </div>
            </div>
          </div>

          {/* ── Card 2: One-time Setup ── */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--caramel)]/60 bg-[var(--surface-warm)] shadow-[0_8px_40px_rgba(127,85,57,0.07)]">
            {/* Badge */}
            <div className="absolute inset-x-0 top-0 flex justify-center">
              <span className="rounded-b-xl bg-[var(--caramel)] px-4 py-1 font-body text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-[var(--dark-brown)]">
                One-time Setup
              </span>
            </div>

            <div className="flex flex-1 flex-col px-5 pb-6 pt-10 sm:px-10 sm:pb-8 sm:pt-14">
              {/* Price */}
              <div className="mb-2 text-center">
                <p className="font-display text-[38px] sm:text-[56px] font-bold leading-none text-[var(--dark-brown)]">
                  ₹50,000
                  <span className="font-body text-[14px] sm:text-[18px] font-normal text-[var(--walnut)]">
                    {' '}one-time
                  </span>
                </p>
                <p className="mt-1 sm:mt-2 font-body text-[12px] sm:text-[13px] text-[var(--walnut)]">
                  Paid once · Lifetime access to setup
                </p>
              </div>

              {/* Divider */}
              <div className="my-4 sm:my-6 h-px bg-[var(--caramel)]/30" />

              {/* What's included */}
              <p className="mb-3 text-left font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider text-[var(--rust)]">
                What's included
              </p>
              <ul className="flex flex-col gap-2 sm:gap-3">
                {[
                  'Full platform setup & configuration',
                  'Data migration & Excel import setup',
                  'Custom workflow configuration',
                  'Team training & onboarding sessions',
                  'WhatsApp Business API integration',
                  'AI voice call system setup',
                  '7-day post-launch hand-holding support',
                ].map((item) => (
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
                  Setup fee is a one-time investment. Once paid, you only pay the monthly platform fee going forward.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Add-ons: WhatsApp + Calling ── */}
        <motion.div variants={itemVariants} className="mt-5 sm:mt-8">
          <p className="mb-4 text-center font-body text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-[var(--rust)]">
            Usage-based add-ons
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
