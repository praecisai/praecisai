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
    <motion.button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex h-8 w-[58px] flex-shrink-0 cursor-pointer items-center rounded-full focus:outline-none"
      animate={{
        background: isDark
          ? 'linear-gradient(135deg, #1a0d04, #0f0602)'
          : 'linear-gradient(135deg, #ede0d4, #e6ccb2)',
        borderColor: isDark ? 'rgba(221,184,146,0.35)' : 'rgba(127,85,57,0.35)',
      }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      style={{ border: '1px solid', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
    >
      {/* Sliding thumb */}
      <motion.div
        className="absolute flex h-6 w-6 items-center justify-center rounded-full overflow-hidden"
        animate={{
          x: isDark ? 28 : 4,
          background: isDark
            ? 'linear-gradient(135deg, #DDB892, #B08968)'
            : 'linear-gradient(135deg, #7F5539, #9C6644)',
          boxShadow: isDark
            ? '0 2px 10px rgba(221,184,146,0.4)'
            : '0 2px 10px rgba(127,85,57,0.35)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {/* Icon rotates OUT then new one rotates IN */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isDark ? 'sun' : 'moon'}
            initial={{ rotate: -120, opacity: 0, scale: 0.3 }}
            animate={{ rotate: 0,    opacity: 1, scale: 1   }}
            exit={{    rotate:  120, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isDark
              ? <IconMoon size={14} stroke={2.5} style={{ color: '#0F0A06' }} />
              : <IconSun  size={14} stroke={2.5} style={{ color: '#FFFDF9' }} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
}
