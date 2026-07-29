'use client';

import { motion } from 'framer-motion';
import {
  IconDatabaseImport,
  IconTarget,
  IconRobot,
  IconCalendarRepeat,
  IconArrowRight,
} from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce, scaleIn } from './motion';
import AnimatedHeading from './AnimatedHeading';

const steps = [
  {
    number: '01',
    icon: IconDatabaseImport,
    title: 'Data comes in',
    description:
      'Upload manually or connect your software. PraecisAI ingests customer details, outstanding amount, invoice and ledger history, and past communication.',
    tags: ['Excel / CSV upload', 'Tally · Zoho · SAP', 'Auto column mapping'],
    iconBg: 'var(--sand)',
  },
  {
    number: '02',
    icon: IconTarget,
    title: 'Auto-segmentation into 4 stages',
    description:
      'Every party is scored into Soft Reminder, Follow-up, Strong Follow-up, and Escalation. You decide the day-ranges for each stage, for example Soft Reminder 90 to 120 days, Follow-up 120 to 150, Strong Follow-up 150 to 200, Escalation 200+. Fully configurable to your business.',
    tags: ['4 recovery stages', 'Your day-ranges', 'Fully configurable'],
    iconBg: 'var(--sand)',
  },
  {
    number: '03',
    icon: IconRobot,
    title: 'AI calls and WhatsApp, automatically',
    description:
      'PraecisAI calls every customer in your outstanding list, hundreds of parties in minutes, at whatever time slots you choose. WhatsApp reminders with a branded PDF go out on your cadence, and the tone changes by stage: a soft polite nudge in Soft Reminder, a direct firm message in Escalation.',
    tags: ['Hindi + English calls', 'WhatsApp + PDF', 'Tone shifts by stage'],
    iconBg: 'var(--sand)',
  },
  {
    number: '04',
    icon: IconCalendarRepeat,
    title: 'Every promise is tracked and followed up',
    description:
      'When a customer promises payment in 7 days, PraecisAI logs it and calls back exactly when due, or after whatever grace period you set. Grace periods can even differ per stage: +10 days in Soft Reminder, +5 in Follow-up, +1 to 2 in Strong Follow-up, 0 in Escalation.',
    tags: ['Promise-to-pay log', 'Auto call-back', 'Per-stage grace periods'],
    iconBg: 'var(--sand)',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-[var(--cream)] px-4 py-16 sm:px-8 sm:py-36 text-center"
    >
      <motion.div
        className="mx-auto w-full max-w-7xl"
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
          How it works
        </motion.p>
        <AnimatedHeading
          text="From outstanding data to recovered cash"
          className="mx-auto max-w-2xl text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
        />
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-4 sm:mt-5 max-w-2xl text-center font-body text-[13px] sm:text-[15px] leading-relaxed text-[var(--walnut)]"
        >
          Four automated steps, every one of them configurable to how your business
          actually chases payments.
        </motion.p>

        {/* Step cards */}
        <div className="relative mt-8 sm:mt-20 grid grid-cols-2 gap-3 sm:gap-8 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={scaleIn}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -6, boxShadow: '0 20px 56px rgba(127,85,57,0.15)', transition: { delay: 0, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
              className={`spotlight-card relative flex flex-col rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-4 sm:p-7 text-left transition-shadow duration-200${
                index === steps.length - 1 && steps.length % 2 === 1
                  ? ' col-span-2 sm:col-span-1 mx-auto w-[calc(50%-6px)] sm:w-auto'
                  : ''
              }`}
            >
              {/* Arrow connector (desktop only) */}
              {index < steps.length - 1 && (
                <div className="absolute -right-7 top-1/2 z-10 hidden -translate-y-1/2 lg:flex">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={viewportOnce}
                    transition={{ delay: 0.5 + index * 0.2 }}
                    className="animate-arrow-pulse flex h-10 w-10 items-center justify-center rounded-full border border-[var(--mahogany)] bg-[var(--mahogany)]"
                  >
                    <IconArrowRight size={18} className="text-[var(--cream)]" stroke={2} />
                  </motion.div>
                </div>
              )}

              {/* Step number + icon row */}
              <div className="mb-4 sm:mb-6 flex items-center justify-between">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mahogany)] font-display text-sm font-bold text-[var(--cream)]"
                >
                  {step.number}
                </span>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--mahogany)]"
                  style={{ backgroundColor: step.iconBg }}
                >
                  <step.icon size={22} stroke={1.75} />
                </div>
              </div>

              <h3 className="font-display text-[13px] sm:text-[17px] font-semibold leading-snug text-[var(--dark-brown)]">
                {step.title}
              </h3>
              <p className="mt-2 sm:mt-3 font-body text-[11px] sm:text-[13.5px] leading-[1.65] text-[var(--walnut)]">
                {step.description}
              </p>
              <div className="flex-1" />
              <div className="mt-6 flex flex-wrap gap-2">
                {step.tags.map((tag, ti) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={viewportOnce}
                    transition={{ delay: 0.4 + index * 0.2 + ti * 0.08, duration: 0.3 }}
                    className="rounded-full border border-[var(--caramel)] bg-[var(--cream)] px-3 py-1 font-body text-[11px] font-medium text-[var(--walnut)]"
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
