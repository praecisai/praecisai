'use client';

import { motion } from 'framer-motion';
import { PartyPopper, ArrowRight } from 'lucide-react';

export default function DemoExhaustedBanner() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-[var(--caramel)] bg-[var(--cream)] px-4 py-6 sm:px-8"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-6 text-center shadow-sm sm:flex-row sm:text-left">
        <div>
          <h2 className="font-display flex items-center justify-center sm:justify-start gap-2 text-base sm:text-lg font-semibold text-[var(--dark-brown)]">
            <PartyPopper className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--mahogany)]" />
            You&apos;ve experienced your free demo
          </h2>
          <p className="mt-1 font-body text-[13px] sm:text-[14px] text-[var(--walnut)]">
            Ready to import your real outstanding report and start recovering cash automatically?
          </p>
        </div>
        <a 
          href="/#pricing"
          className="whitespace-nowrap rounded-lg sm:rounded-xl bg-[var(--mahogany)] px-5 py-2.5 sm:px-6 sm:py-3 font-display text-[14px] sm:text-[15px] font-semibold text-white transition-colors hover:bg-[var(--rust)] shadow-md"
        >
          <span className="flex items-center gap-2">
            Start Your Free Pilot <ArrowRight className="h-4 w-4" />
          </span>
        </a>
      </div>
    </motion.div>
  );
}
