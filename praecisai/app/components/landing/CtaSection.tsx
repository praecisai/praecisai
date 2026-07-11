'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconBrandWhatsapp, IconArrowRight } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#0F0A06] px-5 py-28 sm:px-8 sm:py-32">
      {/* Grain texture */}
      <div className="grain-overlay" aria-hidden />

      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(156,102,68,0.12) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="relative mx-auto w-full max-w-[600px] text-center"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Label */}
        <motion.p
          variants={itemVariants}
          className="mb-5 font-body text-xs font-semibold uppercase tracking-[0.15em] text-[var(--rust)]"
        >
          Get started today
        </motion.p>

        <motion.h2
          variants={itemVariants}
          className="font-display font-bold leading-[1.08] text-[#FDF8F3]"
          style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
        >
          Stop chasing.
          <br />
          Start recovering.
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-5 max-w-[440px] font-body text-[15px] leading-[1.7] text-[var(--walnut)]"
        >
          Join Indian businesses recovering dues faster with PraecisAI. 14 days free, no setup required.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="#demo"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--rust)] px-7 py-4 font-display text-[15px] font-semibold text-[var(--cream)] shadow-[0_4px_20px_rgba(156,102,68,0.35)] transition-all duration-200 hover:bg-[var(--mahogany)] hover:shadow-[0_6px_28px_rgba(127,85,57,0.4)] sm:w-auto"
          >
            Start your free pilot
            <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://wa.me/917304862949"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(221,184,146,0.3)] px-7 py-4 font-display text-[15px] font-semibold text-[#FDF8F3] transition-all duration-200 hover:border-[var(--caramel)] hover:bg-[#FFFFFF]/5 sm:w-auto"
          >
            <IconBrandWhatsapp size={18} stroke={1.75} />
            WhatsApp us instead
          </a>
        </motion.div>

        {/* Sub-note */}
        <motion.p
          variants={itemVariants}
          className="mt-7 font-body text-[12px] tracking-wide text-[var(--walnut)]"
        >
          No setup fee · No credit card · 14-day free pilot
        </motion.p>
      </motion.div>
    </section>
  );
}
