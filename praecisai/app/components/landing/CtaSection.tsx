'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconBrandWhatsapp, IconArrowRight } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

function scrollToDemo(e: React.MouseEvent) {
  e.preventDefault();
  const el = document.getElementById('demo');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', '#demo');
  }
}

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#0F0A06] px-5 py-16 sm:px-8 sm:py-32">
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
          className="text-[1.7rem] sm:text-[clamp(2rem,5vw,3rem)] font-display font-bold leading-[1.08] text-[#FDF8F3]"
        >
          Stop chasing.{' '}
          <br />
          Start recovering.
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-5 max-w-[440px] font-body text-[15px] leading-[1.7] text-[var(--walnut)]"
        >
          Join Indian businesses recovering dues faster with PraecisAI. See the platform live with a quick demo.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={itemVariants}
          className="mt-8 sm:mt-10 flex flex-row items-stretch justify-center gap-2.5 sm:gap-4"
        >
          {/* Side by side on phones rather than two full-width stacked slabs */}
          <button
            onClick={scrollToDemo}
            className="group inline-flex flex-1 sm:flex-none w-full items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-[var(--rust)] px-3 py-3 sm:px-7 sm:py-4 font-display text-[13px] sm:text-[15px] font-semibold text-[var(--cream)] shadow-[0_4px_20px_rgba(156,102,68,0.35)] transition-all duration-200 hover:bg-[var(--mahogany)] hover:shadow-[0_6px_28px_rgba(127,85,57,0.4)] sm:w-auto"
          >
            See Live Demo
            <IconArrowRight size={16} stroke={2} className="hidden sm:block transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
          <a
            href="https://wa.me/917304862949"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 sm:flex-none w-full items-center justify-center gap-1 sm:gap-2 rounded-xl border border-[rgba(221,184,146,0.3)] px-2.5 py-3 sm:px-7 sm:py-4 font-display text-[13px] sm:text-[15px] font-semibold text-[#FDF8F3] transition-all duration-200 hover:border-[var(--caramel)] hover:bg-[#FFFFFF]/5 sm:w-auto"
          >
            <IconBrandWhatsapp size={18} stroke={1.75} className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
            {/* "WhatsApp us instead" needs 142px of text at 13px but only ~122px
                fits beside the icon on a phone, so it wraps to two lines */}
            <span className="whitespace-nowrap sm:hidden">WhatsApp us</span>
            <span className="hidden sm:inline">WhatsApp us instead</span>
          </a>
        </motion.div>

        {/* Sub-note */}
        <motion.p
          variants={itemVariants}
          className="mt-7 font-body text-[12px] tracking-wide text-[var(--walnut)]"
        >
          ₹5,000 / month · ₹50,000 one-time setup · WhatsApp &amp; calls billed separately
        </motion.p>
      </motion.div>
    </section>
  );
}
