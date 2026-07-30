'use client';

import { motion } from 'framer-motion';
import {
  IconPlugConnected,
  IconFileSpreadsheet,
  IconCheck,
  IconShieldLock,
} from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce, scaleIn } from './motion';
import AnimatedHeading from './AnimatedHeading';

const options = [
  {
    label: 'Option 1',
    icon: IconPlugConnected,
    title: 'Auto-sync with your existing software',
    description:
      'Already using Tally, Zoho Books, SAP, or any other accounting, ERP, or billing software? Our team connects with your technical person and integrates directly with what you already use. Once connected, your outstanding data flows into PraecisAI automatically, with no daily manual work ever.',
    tags: ['Tally', 'Zoho Books', 'SAP', 'Custom ERP'],
    featured: true,
  },
  {
    label: 'Option 2',
    icon: IconFileSpreadsheet,
    title: 'Manual daily upload',
    description:
      'Prefer to stay in control? Upload your outstanding Excel or CSV to your PraecisAI dashboard once a day. Any format works: Bill No., Party Name, Due Amount, Days Overdue. We auto-map it in seconds.',
    tags: ['.xlsx', '.csv', 'Auto column mapping'],
    featured: false,
  },
];

export default function TwoWaysSection() {
  return (
    <section
      id="get-started"
      style={{ scrollMarginTop: '88px' }}
      className="border-y border-[rgba(221,184,146,0.35)] bg-[var(--surface-warm)] px-4 py-16 sm:px-8 sm:py-32 text-center"
    >
      <motion.div
        className="mx-auto w-full max-w-6xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Eyebrow + heading */}
        <motion.p
          variants={itemVariants}
          className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rust)]"
        >
          Getting started
        </motion.p>
        <AnimatedHeading
          text="Two ways to feed PraecisAI your outstanding data"
          className="text-[1.5rem] sm:text-[clamp(1.75rem,4vw,2.625rem)] mx-auto max-w-3xl text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
        />
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-4 sm:mt-5 max-w-2xl text-center font-body text-[13px] sm:text-[15px] leading-relaxed text-[var(--walnut)]"
        >
          Technical team or not, PraecisAI always has your latest outstanding data.
        </motion.p>

        {/* Option cards */}
        <div className="mt-8 sm:mt-14 grid gap-4 sm:gap-6 md:grid-cols-2">
          {options.map((option, index) => (
            <motion.div
              key={option.title}
              variants={scaleIn}
              transition={{ delay: index * 0.15 }}
              whileHover={{
                y: -6,
                boxShadow: '0 20px 56px rgba(127,85,57,0.15)',
                transition: { delay: 0, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
              }}
              className={`spotlight-card relative flex flex-col rounded-2xl border bg-[var(--surface-warm)] p-5 text-left transition-shadow duration-200 sm:p-9 ${
                option.featured
                  ? 'border-2 border-[var(--mahogany)] shadow-[0_8px_40px_rgba(127,85,57,0.12)]'
                  : 'border-[var(--caramel)]'
              }`}
            >
              {/* Label + icon */}
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="rounded-full bg-[var(--mahogany)] px-3.5 py-1 font-body text-[10px] font-semibold uppercase tracking-widest text-[var(--cream)] sm:text-[11px]">
                  {option.label}
                </span>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--mahogany)]">
                  <option.icon size={22} stroke={1.75} />
                </div>
              </div>

              <h3 className="font-display text-[15px] font-semibold leading-snug text-[var(--dark-brown)] sm:text-xl">
                {option.title}
              </h3>
              <p className="mt-2.5 font-body text-[12px] leading-[1.7] text-[var(--walnut)] sm:mt-4 sm:text-[14px]">
                {option.description}
              </p>

              <div className="flex-1" />

              <div className="mt-6 flex flex-wrap gap-2">
                {option.tags.map((tag, ti) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={viewportOnce}
                    transition={{ delay: 0.35 + index * 0.15 + ti * 0.07, duration: 0.3 }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--caramel)] bg-[var(--cream)] px-3 py-1 font-body text-[11px] font-medium text-[var(--walnut)]"
                  >
                    <IconCheck size={11} stroke={2.5} className="text-[var(--mahogany)]" />
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing note */}
        <motion.div
          variants={itemVariants}
          className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-[var(--caramel)] bg-[var(--sand)]/50 px-5 py-4 text-left sm:mt-8 sm:px-7 sm:py-5"
        >
          <IconShieldLock size={18} stroke={1.75} className="mt-0.5 shrink-0 text-[var(--mahogany)]" />
          <p className="font-body text-[12px] leading-[1.7] text-[var(--dark-brown)]/80 sm:text-[14px]">
            Both paths lead to the same result: PraecisAI always has your latest outstanding
            data, and your team never has to manually call or WhatsApp a single customer.
            Your data stays bank-grade secure and never leaves India, whichever option you
            choose.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
