'use client';

import { motion } from 'framer-motion';
import { IconUpload, IconRobot, IconChartBar, IconArrowRight } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

const steps = [
  {
    number: '01',
    icon: IconUpload,
    title: 'Upload your report',
    description:
      'Drag your daily Excel outstanding file. Any format works: Bill No., Party Name, Due Amount, Days Outstanding. We map it automatically.',
    tags: ['.xlsx supported', 'CSV supported', 'Google Sheets coming'],
    iconBg: 'var(--sand)',
  },
  {
    number: '02',
    icon: IconRobot,
    title: 'AI takes over',
    description:
      'PraecisAI segments every party by risk level: Soft Reminder, Follow-up, Strong Follow-up, or Escalation. Then sends WhatsApp messages, PDF statements, and Hindi voice calls automatically.',
    tags: ['WhatsApp', 'Voice calls', 'PDF statements'],
    iconBg: 'var(--sand)',
  },
  {
    number: '03',
    icon: IconChartBar,
    title: 'Track every rupee',
    description:
      'See who paid, who promised, who ignored. Dashboard updates in real time. Weekly owner report lands in your WhatsApp every Monday morning.',
    tags: ['Real-time dashboard', 'Promise tracker', 'Weekly reports'],
    iconBg: 'var(--sand)',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-[rgba(221,184,146,0.35)] bg-[var(--surface-warm)] px-5 py-28 sm:px-8 sm:py-36 text-center"
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
        <motion.h2
          variants={itemVariants}
          className="mx-auto max-w-2xl text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
        >
          From Excel upload to recovered cash in 3 steps
        </motion.h2>

        {/* Step cards */}
        <div className="relative mt-20 grid gap-8 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              transition={{ delay: index * 0.15 }}
              className="relative rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-8 sm:p-10"
            >
              {/* Arrow connector (desktop only) */}
              {index < steps.length - 1 && (
                <div className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 lg:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--caramel)] bg-[var(--cream)]">
                    <IconArrowRight size={18} className="text-[var(--caramel)]" stroke={1.75} />
                  </div>
                </div>
              )}

              {/* Step number + icon row */}
              <div className="mb-7 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--mahogany)] font-display text-sm font-bold text-[var(--cream)]">
                  {step.number}
                </span>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--mahogany)]"
                  style={{ backgroundColor: step.iconBg }}
                >
                  <step.icon size={24} stroke={1.75} />
                </div>
              </div>

              <h3 className="font-display text-xl font-semibold text-[var(--dark-brown)]">
                {step.title}
              </h3>
              <p className="mt-4 font-body text-[14px] leading-[1.75] text-[var(--walnut)]">
                {step.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {step.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--caramel)] bg-[var(--cream)] px-3 py-1 font-body text-[11px] font-medium text-[var(--walnut)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
