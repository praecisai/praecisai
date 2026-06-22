import React from 'react';
import { motion } from 'framer-motion';

export default function LogoReveal() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
      {/* Horizontal line */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-px w-full max-w-[280px] -translate-x-1/2 -translate-y-1/2 bg-[var(--rust)] sm:max-w-[360px]"
        initial={{ scaleX: 0, opacity: 0.6 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0, duration: 0.6, ease: 'easeOut' }}
        style={{ transformOrigin: 'left center' }}
      />

      {/* Logo */}
      <div className="relative z-10 flex items-baseline gap-0">
        <motion.span
          className="font-display text-[44px] font-bold tracking-[-0.04em] text-[#FDF8F3] sm:text-[72px]"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.175, 0.885, 0.32, 1.1] }} 
        >
          PRAECIS
        </motion.span>
        <motion.span
          className="font-display text-[44px] font-bold tracking-[-0.04em] text-[var(--rust)] sm:text-[72px]"
          style={{ textShadow: '0 0 40px rgba(156,102,68,0.6)' }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.175, 0.885, 0.32, 1.1], delay: 0.2 }}
        >
          AI
        </motion.span>
      </div>

      {/* Tagline + dots */}
      <motion.div
        className="mt-8 flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 1.0 }}
      >
        <motion.span
          className="h-1 w-1 rounded-full bg-[var(--rust)]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        />
        <p className="font-body text-[14px] uppercase tracking-[0.2em] text-[var(--walnut)]">
          Recover faster. Chase smarter.
        </p>
        <motion.span
          className="h-1 w-1 rounded-full bg-[var(--rust)]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        />
      </motion.div>
    </div>
  );
}
