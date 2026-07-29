'use client';

import { motion } from 'framer-motion';
import {
  IconBrain,
  IconClockPause,
  IconHeadset,
  IconReportAnalytics,
  IconThumbUp,
  IconThumbDown,
  IconCalendarCheck,
  IconAlertTriangle,
  IconCoin,
} from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce, scaleIn } from './motion';
import AnimatedHeading from './AnimatedHeading';

const differentiators = [
  {
    icon: IconBrain,
    title: 'Full conversation memory across every call',
    description:
      'PraecisAI does not treat every call as new. If a customer has spoken to it four times before, it walks into the fifth call already knowing the full history and summary of all four. No customer repeats themselves, no promise falls through the cracks.',
  },
  {
    icon: IconClockPause,
    title: 'Configurable grace periods, stage by stage',
    description:
      'You decide how much slack to give a customer just entering Soft Reminder versus one deep in Escalation. PraecisAI respects that automatically on every call.',
  },
  {
    icon: IconHeadset,
    title: 'Live call transfer to your accountant',
    description:
      'If a customer disputes an amount or asks to speak to a human, PraecisAI transfers the call directly to your accountant or team, with an instant WhatsApp alert giving them context so they are never caught off guard.',
  },
];

const ownerReports = [
  {
    icon: IconThumbUp,
    title: 'Positive Response',
    description: 'Customers responding well.',
  },
  {
    icon: IconThumbDown,
    title: 'Negative Response',
    description: 'Repeated non-pickups, broken promises, disputes, hostile replies.',
  },
  {
    icon: IconCalendarCheck,
    title: 'Promise to Pay',
    description: 'Every commitment logged with a date.',
  },
  {
    icon: IconAlertTriangle,
    title: 'Escalation Report',
    description: 'Accounts past your threshold, sent to owner and accountant.',
  },
  {
    icon: IconCoin,
    title: 'Payment Summary',
    description: 'Which stage or segment your cash is actually coming from.',
  },
];

export default function DifferentiatorSection() {
  return (
    <section
      id="why-different"
      style={{ scrollMarginTop: '88px' }}
      className="border-y border-[rgba(221,184,146,0.35)] bg-[var(--surface-warm)] px-4 py-16 sm:px-8 sm:py-36 text-center"
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
          What makes PraecisAI different from a calling bot
        </motion.p>
        <AnimatedHeading
          text="This isn't a recorded reminder call. It's a system that remembers."
          className="mx-auto max-w-3xl text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.625rem)' }}
        />

        {/* Three differentiator cards */}
        <div className="mt-8 sm:mt-14 grid gap-4 sm:gap-6 lg:grid-cols-3">
          {differentiators.map((item, index) => (
            <motion.div
              key={item.title}
              variants={scaleIn}
              transition={{ delay: index * 0.12 }}
              whileHover={{
                y: -6,
                boxShadow: '0 20px 56px rgba(127,85,57,0.15)',
                transition: { delay: 0, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
              }}
              className="spotlight-card rounded-2xl border border-[var(--caramel)] bg-[var(--cream)] p-5 text-left transition-shadow duration-200 sm:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-warm)] text-[var(--mahogany)]">
                <item.icon size={24} stroke={1.75} />
              </div>
              <h3 className="font-display text-[14px] font-semibold leading-snug text-[var(--dark-brown)] sm:text-[17px]">
                {item.title}
              </h3>
              <p className="mt-2.5 font-body text-[12px] leading-[1.7] text-[var(--walnut)] sm:mt-3 sm:text-[14px]">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Five owner-facing reports */}
        <motion.div
          variants={itemVariants}
          className="mt-4 rounded-2xl border-2 border-[var(--mahogany)] bg-[var(--cream)] p-5 text-left shadow-[0_8px_40px_rgba(127,85,57,0.1)] sm:mt-6 sm:p-9"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--mahogany)] text-[var(--cream)]">
              <IconReportAnalytics size={22} stroke={1.75} />
            </div>
            <div>
              <h3 className="font-display text-[15px] font-semibold text-[var(--dark-brown)] sm:text-xl">
                Five owner-facing reports, every week
              </h3>
              <p className="mt-1 font-body text-[12px] leading-relaxed text-[var(--walnut)] sm:text-[14px]">
                Delivered automatically, so you always know where your cash is stuck.
              </p>
            </div>
          </div>

          <ul className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {ownerReports.map((report, index) => (
              <motion.li
                key={report.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ delay: 0.1 + index * 0.08, duration: 0.45 }}
                className="flex items-start gap-3 rounded-xl border border-[var(--caramel)]/70 bg-[var(--surface-warm)] px-4 py-3.5"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sand)] text-[var(--mahogany)]">
                  <report.icon size={16} stroke={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-[13px] font-semibold text-[var(--dark-brown)]">
                    {report.title}
                  </p>
                  <p className="mt-0.5 font-body text-[11px] leading-[1.6] text-[var(--walnut)] sm:text-[12px]">
                    {report.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </section>
  );
}
