'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconCheck, IconArrowRight, IconShieldCheck } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';
import AnimatedHeading from './AnimatedHeading';

const features = [
  'Unlimited parties',
  'WhatsApp campaigns',
  'AI voice calls (Hindi)',
  'PDF statements',
  'Smart segmentation',
  'Promise tracker',
  'Owner weekly report',
  'Dashboard',
  'Import any Excel format',
  'Dedicated onboarding',
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-[var(--cream)] px-5 py-28 sm:px-8 sm:py-36 text-center">
      <motion.div
        className="mx-auto w-full max-w-2xl text-center"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Heading */}
        <motion.p
          variants={itemVariants}
          className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rust)]"
        >
          Pricing
        </motion.p>
        <AnimatedHeading
          text="Simple, honest pricing"
          className="text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
        />
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-5 max-w-md text-center font-body text-[15px] leading-relaxed text-[var(--walnut)]"
        >
          One plan. Everything included. No hidden fees.
        </motion.p>

        {/* Pricing card */}
        <motion.div
          variants={itemVariants}
          className="relative mt-14 overflow-visible"
        >
          {/* Early access badge */}
          <div className="flex justify-center">
            <span className="relative z-10 mb-[-1px] rounded-t-xl bg-[var(--mahogany)] px-5 py-2 font-body text-xs font-semibold text-[var(--cream)] shadow-[0_-4px_16px_rgba(127,85,57,0.2)]">
              Early Access - Limited Spots
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border-2 border-[var(--mahogany)] bg-[var(--surface-warm)] shadow-[0_8px_40px_rgba(127,85,57,0.12)]">
            {/* Price header */}
            <div className="bg-[var(--surface-warm)] px-8 py-10 text-center sm:px-10">
              <p className="font-display text-[52px] font-bold leading-none text-[var(--dark-brown)]">
                ₹4,999
                <span className="font-body text-[18px] font-normal text-[var(--walnut)]"> / month</span>
              </p>
              <span className="mt-5 inline-block rounded-full border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-1.5 font-body text-[13px] text-[var(--mahogany)]">
                Equivalent to 1 recovered invoice
              </span>
              <p className="mx-auto mt-6 max-w-md font-body text-[14px] leading-relaxed text-[var(--walnut)]">
                Full platform access. WhatsApp campaigns, voice calls, PDF statements,
                smart segmentation, dashboard, reports, and everything in between.
              </p>
            </div>

            {/* Feature list */}
            <div className="px-8 pb-0 pt-8 sm:px-10">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--mahogany)]">
                      <IconCheck size={11} className="text-[var(--cream)]" stroke={3} />
                    </div>
                    <span className="font-body text-[14px] text-[var(--dark-brown)]">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Flat rate note */}
              <div className="mt-8 flex items-center gap-3 rounded-xl bg-[var(--sand)] px-5 py-4">
                <IconShieldCheck size={20} className="shrink-0 text-[var(--mahogany)]" stroke={1.75} />
                <p className="font-body text-[13px] text-[var(--dark-brown)]/80">
                  No per-message charges. No per-call fees. Flat monthly. Cancel anytime.
                </p>
              </div>

              {/* CTA */}
              <div className="pb-10 pt-7">
                <Link
                  href="#demo"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--mahogany)] px-6 py-4 font-display text-[15px] font-semibold text-[var(--cream)] shadow-[0_4px_20px_rgba(127,85,57,0.3)] transition-all duration-200 hover:bg-[var(--rust)] hover:shadow-[0_6px_28px_rgba(156,102,68,0.35)]"
                >
                  Start free pilot
                  <IconArrowRight size={18} stroke={2} />
                </Link>
                <p className="mt-4 text-center font-body text-[12px] text-[var(--walnut)]">
                  14-day free pilot · No credit card required
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
