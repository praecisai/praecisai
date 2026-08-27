'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { IconShieldLock, IconMapPin, IconBolt } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

const DemoSignupForm = dynamic(() => import('../demo/DemoSignupForm'), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-[var(--sand)]" />,
});

const trustSignals = [
  { icon: IconShieldLock, text: 'Bank-grade security' },
  { icon: IconMapPin, text: 'Data never leaves India' },
  { icon: IconBolt, text: 'Live in 10 minutes' },
];

export default function DemoSection() {
  return (
    <section className="bg-[var(--cream)] px-4 pb-16 pt-8 sm:px-8 sm:pb-36 sm:pt-16 text-center">
      {/* Anchor for scroll navigation - moved out of animated/expanding areas */}
      <div id="demo" style={{ scrollMarginTop: '80px' }} />
      <motion.div
        className="mx-auto w-full max-w-7xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <motion.div
          variants={itemVariants}
          className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-xl"
        >
          <div className="bg-[var(--sand)] px-6 py-6 sm:px-8 border-b border-[var(--caramel)]">
            <h3 className="font-display text-xl font-semibold text-[var(--dark-brown)] text-center sm:text-left">
              Experience the platform live
            </h3>
            <p className="mt-1 font-body text-[14px] text-[var(--walnut)] text-center sm:text-left">
              Try 2 live AI actions (WhatsApp/Voice Call) on our interactive demo dashboard.
            </p>

            {/* Trust signals sit right at the decision point */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:gap-x-5 sm:gap-y-2 border-t border-[var(--caramel)]/60 pt-4 sm:justify-start">
              {trustSignals.map((signal) => (
                <span
                  key={signal.text}
                  className="inline-flex items-center gap-1 sm:gap-1.5 font-body text-[11px] sm:text-[12px] font-medium text-[var(--dark-brown)]/80"
                >
                  <signal.icon size={14} stroke={1.9} className="text-[var(--mahogany)]" />
                  {signal.text}
                </span>
              ))}
            </div>
          </div>
          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <DemoSignupForm />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
