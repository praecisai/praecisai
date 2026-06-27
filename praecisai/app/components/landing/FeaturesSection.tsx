'use client';

import { motion } from 'framer-motion';
import {
  IconBrandWhatsapp,
  IconMicrophone,
  IconFileDescription,
  IconTarget,
  IconCalendarCheck,
  IconAlertTriangle,
  IconShieldCheck,
  IconClock,
  IconUsers,
} from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce, scaleIn } from './motion';
// scaleIn kept for feature cards
import AnimatedHeading from './AnimatedHeading';

const features = [
  {
    icon: IconBrandWhatsapp,
    title: 'WhatsApp Campaigns',
    description:
      'Personalized Hindi messages with party name, bill details, and due amount. Sent in bulk with read receipts tracked.',
    iconBg: 'var(--sand)',
  },
  {
    icon: IconMicrophone,
    title: 'AI Voice Calls',
    description:
      'Natural-sounding Hindi voice calls that explain the outstanding, take a promise to pay, and log the response automatically.',
    iconBg: 'var(--sand)',
  },
  {
    icon: IconFileDescription,
    title: 'PDF Statements',
    description:
      'Branded, professional outstanding statements auto-generated per party and sent via WhatsApp. Zero manual work.',
    iconBg: 'var(--sand)',
  },
  {
    icon: IconTarget,
    title: 'Smart Segmentation',
    description:
      'Every party auto-scored by aging and amount. Your team always knows who to call first and at what urgency.',
    iconBg: 'var(--sand)',
  },
  {
    icon: IconCalendarCheck,
    title: 'Promise Tracker',
    description:
      "Every commitment gets logged with a date. Follow-up is auto-scheduled so no promise slips through the cracks.",
    iconBg: 'var(--sand)',
  },
  {
    icon: IconAlertTriangle,
    title: 'Critical Account Alerts',
    description:
      'Weekly report of every account above ₹3L or 200+ days, sent to the owner every Monday morning.',
    iconBg: 'var(--sand)',
  },
];

const trustPoints = [
  { icon: IconShieldCheck, text: 'Bank-grade data security. Your data never leaves India.' },
  { icon: IconClock, text: 'Set up in under 10 minutes. Upload Excel and go live.' },
  { icon: IconUsers, text: 'Built specifically for Indian MSME businesses.' },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-[var(--cream)] px-5 py-28 sm:px-8 sm:py-36 text-center">
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
          Features
        </motion.p>
        <AnimatedHeading
          text="Everything your collections team needs"
          className="text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
        />
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-5 max-w-xl text-center font-body text-[15px] leading-relaxed text-[var(--walnut)]"
        >
          From first reminder to final payment, every step automated and every rupee tracked.
        </motion.p>

        {/* Feature grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={scaleIn}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -6, boxShadow: '0 20px 56px rgba(127,85,57,0.14)', transition: { delay: 0, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
              className="spotlight-card group rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-8 transition-shadow duration-200"
            >
              <motion.div
                whileHover={{ scale: 1.12, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
                className="mx-auto mb-5 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: feature.iconBg, width: '52px', height: '52px' }}
              >
                <feature.icon size={24} className="text-[var(--mahogany)]" stroke={1.5} />
              </motion.div>
              <h3 className="font-display text-[17px] font-semibold text-[var(--dark-brown)]">
                {feature.title}
              </h3>
              <p className="mt-3 font-body text-[14px] leading-[1.75] text-[var(--walnut)]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </section>
  );
}
