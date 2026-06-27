'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { IconSun, IconMoon } from '@tabler/icons-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="h-7 w-12 opacity-0" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className="relative flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus:outline-none"
      style={{
        background: isDark ? 'rgba(221,184,146,0.1)' : 'rgba(127,85,57,0.1)',
        border: '1px solid rgba(221,184,146,0.35)',
      }}
    >
      {/* Sliding thumb */}
      <motion.div
        className="absolute flex h-5 w-5 items-center justify-center rounded-full"
        style={{ background: isDark ? '#DDB892' : '#7F5539' }}
        animate={{ x: isDark ? 24 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      >
        {isDark
          ? <IconSun  size={11} stroke={2.2} style={{ color: '#0F0A06' }} />
          : <IconMoon size={11} stroke={2.2} style={{ color: '#FFFDF9' }} />}
      </motion.div>

      {/* Static dim icons on each side */}
      <IconMoon size={10} stroke={1.8}
        className="absolute left-[5px]"
        style={{ color: isDark ? 'rgba(221,184,146,0.3)' : 'rgba(127,85,57,0.25)' }}
      />
      <IconSun size={10} stroke={1.8}
        className="absolute right-[5px]"
        style={{ color: isDark ? 'rgba(221,184,146,0.3)' : 'rgba(127,85,57,0.25)' }}
      />
    </button>
  );
}
