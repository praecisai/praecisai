'use client';

import { motion } from 'framer-motion';
import { IconUpload, IconRobot, IconChartBar, IconArrowRight } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce, scaleIn } from './motion';
import AnimatedHeading from './AnimatedHeading';

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
        <AnimatedHeading
          text="From Excel upload to recovered cash in 3 steps"
          className="mx-auto max-w-2xl text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
        />

        {/* Step cards */}
        <div className="relative mt-20 grid gap-8 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={scaleIn}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -6, boxShadow: '0 20px 56px rgba(127,85,57,0.15)', transition: { delay: 0, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
              className="spotlight-card relative rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-8 sm:p-10 transition-shadow duration-200"
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
              <div className="mb-7 flex items-center justify-between">
                <motion.span
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={viewportOnce}
                  transition={{ delay: 0.1 + index * 0.2, type: 'spring', stiffness: 200, damping: 12 }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--mahogany)] font-display text-sm font-bold text-[var(--cream)]"
                >
                  {step.number}
                </motion.span>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={viewportOnce}
                  transition={{ delay: 0.2 + index * 0.2, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--mahogany)]"
                  style={{ backgroundColor: step.iconBg }}
                >
                  <step.icon size={24} stroke={1.75} />
                </motion.div>
              </div>

              <h3 className="font-display text-xl font-semibold text-[var(--dark-brown)]">
                {step.title}
              </h3>
              <p className="mt-4 font-body text-[14px] leading-[1.75] text-[var(--walnut)]">
                {step.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
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
