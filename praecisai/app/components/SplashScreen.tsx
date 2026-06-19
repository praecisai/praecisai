'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), 3400);
    return () => clearTimeout(exitTimer);
  }, []);

  useEffect(() => {
    if (!isExiting) return;
    const completeTimer = setTimeout(onComplete, 500);
    return () => clearTimeout(completeTimer);
  }, [isExiting, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0F0A06]"
      initial={{ opacity: 1, y: 0 }}
      animate={isExiting ? { opacity: 0, y: -30 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeIn' }}
    >
      <div className="grain-overlay" aria-hidden />

      <div className="relative flex flex-col items-center px-6">
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
          >
            PRAECIS
          </motion.span>
          <motion.span
            className="font-display text-[44px] font-bold tracking-[-0.04em] text-[var(--rust)] sm:text-[72px]"
            style={{ textShadow: '0 0 40px rgba(156,102,68,0.6)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: [1, 1.02, 1],
            }}
            transition={{
              opacity: { delay: 0.7, duration: 0.7, ease: 'easeOut' },
              y: { delay: 0.7, duration: 0.7, ease: 'easeOut' },
              scale: { delay: 1.4, duration: 0.4, ease: 'easeInOut' },
            }}
          >
            AI
          </motion.span>
        </div>

        {/* Tagline + dots */}
        <motion.div
          className="mt-8 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <motion.span
            className="h-1 w-1 rounded-full bg-[var(--rust)]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6, duration: 0.3 }}
          />
          <p className="font-body text-[14px] uppercase tracking-[0.2em] text-[var(--walnut)]">
            Recover faster. Chase smarter.
          </p>
          <motion.span
            className="h-1 w-1 rounded-full bg-[var(--rust)]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6, duration: 0.3 }}
          />
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFFFFF]/[0.08]">
        <motion.div
          className="h-full bg-[var(--rust)]"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ delay: 2.2, duration: 1.2, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
