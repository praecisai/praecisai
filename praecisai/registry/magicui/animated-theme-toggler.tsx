'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSun, IconMoon } from '@tabler/icons-react';

export function AnimatedThemeToggler() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="h-8 w-[58px]" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex h-8 w-[58px] flex-shrink-0 cursor-pointer items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mahogany)]"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(30,16,4,0.95), rgba(18,9,2,0.95))'
          : 'linear-gradient(135deg, rgba(237,224,212,0.95), rgba(230,204,178,0.95))',
        border: isDark
          ? '1px solid rgba(221,184,146,0.3)'
          : '1px solid rgba(127,85,57,0.3)',
        boxShadow: isDark
          ? 'inset 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(221,184,146,0.08)'
          : 'inset 0 1px 3px rgba(127,85,57,0.1)',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}
    >
      {/* Track icons — always visible as guide */}
      <IconMoon
        size={11} stroke={1.8}
        className="absolute left-[7px] pointer-events-none"
        style={{
          color: isDark ? 'rgba(221,184,146,0.4)' : 'rgba(127,85,57,0.35)',
          transition: 'color 0.3s',
        }}
      />
      <IconSun
        size={11} stroke={1.8}
        className="absolute right-[7px] pointer-events-none"
        style={{
          color: isDark ? 'rgba(221,184,146,0.4)' : 'rgba(127,85,57,0.35)',
          transition: 'color 0.3s',
        }}
      />

      {/* Sliding thumb */}
      <motion.div
        className="absolute flex h-6 w-6 items-center justify-center rounded-full"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #DDB892, #B08968)'
            : 'linear-gradient(135deg, #7F5539, #9C6644)',
          boxShadow: isDark
            ? '0 2px 8px rgba(221,184,146,0.35), 0 1px 2px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(127,85,57,0.3), 0 1px 2px rgba(0,0,0,0.15)',
        }}
        animate={{ x: isDark ? 28 : 4 }}
        transition={{ type: 'spring', stiffness: 460, damping: 30 }}
      >
        {/* Animated icon inside thumb — rotates on switch */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isDark ? 'sun' : 'moon'}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0,   opacity: 1, scale: 1   }}
            exit={{    rotate: 90,  opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {isDark
              ? <IconSun  size={13} stroke={2.2} style={{ color: '#0F0A06' }} />
              : <IconMoon size={13} stroke={2.2} style={{ color: '#FFFDF9' }} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
