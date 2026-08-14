'use client';

import { motion } from 'framer-motion';
import { IconBrandLinkedin, IconMapPin } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

export default function FounderSection() {
  return (
    <section
      id="founder"
      className="border-y border-[rgba(221,184,146,0.35)] bg-[var(--surface-warm)] px-5 py-14 sm:px-8 sm:py-28"
    >
      <motion.div
        className="mx-auto w-full max-w-6xl grid items-center gap-12 lg:grid-cols-[260px_1fr] lg:gap-20"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Photos column */}
        <motion.div
          variants={itemVariants}
          className="flex flex-row flex-wrap justify-center gap-6 sm:gap-10 lg:flex-col lg:items-start"
        >
          {/* Ravi Prajapati */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative">
              <div className="absolute -bottom-2 -right-2 h-full w-full rounded-2xl bg-[var(--caramel)] opacity-40" />
              <div className="relative flex h-[120px] w-[120px] sm:h-[160px] sm:w-[160px] items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--sand)] to-[var(--caramel)]">
                <span className="font-display text-[32px] sm:text-[42px] font-bold text-[var(--mahogany)]">R</span>
              </div>
            </div>
            <p className="mt-4 font-display text-[16px] sm:text-[20px] font-semibold text-[var(--dark-brown)]">Ravi Prajapati</p>
            <p className="mt-0.5 font-body text-[13px] text-[var(--walnut)]">Founder & CEO, PraecisAI</p>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-[var(--mahogany)] hover:text-[var(--rust)] transition-colors"
            >
              <IconBrandLinkedin size={16} stroke={1.5} />
              Connect
            </a>
          </div>

        </motion.div>

        {/* Story */}
        <motion.div variants={itemVariants}>
          <h2
            className="font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)' }}
          >
            Built to completely eliminate the revenue leak of manual follow-ups.
          </h2>
          {/* Founder quote leads. The section used to open in third-person
              corporate voice and then switch to "I run Aeromen Clothing"
              mid-way, which made the reader stop and work out who was talking.
              Same copy, personal voice first, company context after. */}
          <blockquote className="mt-5 border-l-2 border-[var(--mahogany)] pl-5">
            <p className="font-body text-[14px] sm:text-[16px] italic leading-[1.8] text-[var(--dark-brown)]/85">
              &ldquo;I run Aeromen Clothing. Chasing outstanding payments from my own
              customers, daily calls, endless reminders, promises that still slipped
              through, was a problem I lived with for years. PraecisAI is what I built to
              solve it for myself, and now for other business owners like me.&rdquo;
            </p>
            <footer className="mt-3 font-body text-[13px] font-semibold text-[var(--mahogany)]">
              Ravi Prajapati, Founder &amp; CEO
            </footer>
          </blockquote>
          <p className="mt-6 font-body text-[14px] sm:text-[16px] leading-[1.8] text-[var(--walnut)]">
            It is a pattern we kept seeing: businesses lose capital not because customers refuse to pay, but because follow-ups are inconsistent. A manual call gets missed, an agent forgets, and a plain text message lacks the authority an escalation needs.
          </p>
          <p className="mt-4 font-body text-[14px] sm:text-[16px] leading-[1.8] text-[var(--walnut)]">
            PraecisAI automates that entire cycle. AI voice calls, branded statements and WhatsApp campaigns work together so you recover outstanding accounts predictably, without adding headcount to your collections team.
          </p>
          <p className="mt-4 font-body text-[14px] sm:text-[16px] leading-[1.8] text-[var(--walnut)]">
            It is built for distributors, manufacturers and traders across India: a platform that protects your client relationships while keeping your cash flow uninterrupted.
          </p>
          <div className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-[var(--caramel)] bg-[var(--cream)] px-5 py-2.5">
            <IconMapPin size={20} className="text-[var(--mahogany)]" stroke={1.5} />
            <span className="font-body text-[13px] font-semibold text-[var(--mahogany)]">
              Made in India for Indian businesses
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
