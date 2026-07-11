'use client';

import { motion } from 'framer-motion';
import { IconBrandLinkedin, IconMapPin } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

export default function FounderSection() {
  return (
    <section
      id="founder"
      className="border-y border-[rgba(221,184,146,0.35)] bg-[var(--surface-warm)] px-5 py-24 sm:px-8 sm:py-28"
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
          className="flex flex-row flex-wrap justify-center gap-6 sm:gap-10 lg:flex-col lg:items-start lg:gap-12"
        >
          {/* Ravi Prajapati */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative">
              <div className="absolute -bottom-2 -right-2 h-full w-full rounded-2xl bg-[var(--caramel)] opacity-40" />
              <div className="relative flex h-[120px] w-[120px] sm:h-[160px] sm:w-[160px] items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--sand)] to-[var(--caramel)]">
                <span className="font-display text-[32px] sm:text-[42px] font-bold text-[var(--mahogany)]">R</span>
              </div>
            </div>
            <h3 className="mt-4 font-display text-[16px] sm:text-[20px] font-semibold text-[var(--dark-brown)]">Ravi Prajapati</h3>
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

          {/* Viraj Walavalkar */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative">
              <div className="absolute -bottom-2 -right-2 h-full w-full rounded-2xl bg-[var(--caramel)] opacity-40" />
              <div className="relative flex h-[120px] w-[120px] sm:h-[160px] sm:w-[160px] items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--sand)] to-[var(--caramel)]">
                <span className="font-display text-[32px] sm:text-[42px] font-bold text-[var(--mahogany)]">V</span>
              </div>
            </div>
            <h3 className="mt-4 font-display text-[16px] sm:text-[20px] font-semibold text-[var(--dark-brown)]">Viraj Walavalkar</h3>
            <p className="mt-0.5 font-body text-[13px] text-[var(--walnut)]">CTO, PraecisAI</p>
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
          <p className="mt-5 font-body text-[14px] sm:text-[16px] leading-[1.8] text-[var(--walnut)]">
            We observed businesses losing significant capital not because their customers refused to pay, but simply because follow-ups were inconsistent. A manual call gets missed, an agent forgets, and basic text messages lack the professional authority required for escalation.
          </p>
          <p className="mt-4 font-body text-[14px] sm:text-[16px] leading-[1.8] text-[var(--walnut)]">
            PraecisAI was engineered to automate this entire cycle. By blending intelligent AI voice calls with branded statements and WhatsApp campaigns, we ensure you recover your outstanding accounts predictably—without adding headcount to your collections team.
          </p>
          <p className="mt-4 font-body text-[14px] sm:text-[16px] leading-[1.8] text-[var(--walnut)]">
            Designed specifically for distributors, manufacturers, and traders across India. We built a platform that rigorously protects your client relationships while ensuring your cash flow remains uninterrupted.
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
