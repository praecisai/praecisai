'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { container: 'size-20', titleClass: 'text-sm/tight font-medium', subtitleClass: 'text-xs/relaxed', spacing: 'space-y-2', maxWidth: 'max-w-48' },
  md: { container: 'size-32', titleClass: 'text-base/snug font-medium', subtitleClass: 'text-sm/relaxed', spacing: 'space-y-3', maxWidth: 'max-w-56' },
  lg: { container: 'size-40', titleClass: 'text-lg/tight font-semibold', subtitleClass: 'text-base/relaxed', spacing: 'space-y-4', maxWidth: 'max-w-64' },
};

// Palette-matched conic ring configs
// Light: rust/walnut browns   Dark: caramel/cream golds (handled by CSS vars swapping)
const LIGHT_RINGS = [
  // [startAngle, primaryColor, fadedColor, maskInner, maskOuter, duration, direction, opacity]
  { from: '0deg',   primary: '#9C6644', faded: 'rgba(156,102,68,0.45)', maskI: '35%', maskO: '41%', dur: 3,   dir: 1,  op: 0.85 },
  { from: '0deg',   primary: '#7F5539', faded: 'rgba(127,85,57,0.5)',   maskI: '42%', maskO: '50%', dur: 2.5, dir: 1,  op: 0.9  },
  { from: '180deg', primary: 'rgba(156,102,68,0.6)', faded: 'transparent', maskI: '52%', maskO: '58%', dur: 4, dir: -1, op: 0.35 },
  { from: '270deg', primary: 'rgba(176,137,104,0.5)', faded: 'transparent', maskI: '61%', maskO: '64%', dur: 3.5, dir: 1, op: 0.55 },
];

const DARK_RINGS = [
  { from: '0deg',   primary: '#DDB892', faded: 'rgba(221,184,146,0.45)', maskI: '35%', maskO: '41%', dur: 3,   dir: 1,  op: 0.85 },
  { from: '0deg',   primary: '#EDE0D4', faded: 'rgba(237,224,212,0.5)',  maskI: '42%', maskO: '50%', dur: 2.5, dir: 1,  op: 0.9  },
  { from: '180deg', primary: 'rgba(221,184,146,0.6)', faded: 'transparent', maskI: '52%', maskO: '58%', dur: 4, dir: -1, op: 0.35 },
  { from: '270deg', primary: 'rgba(176,137,104,0.5)', faded: 'transparent', maskI: '61%', maskO: '64%', dur: 3.5, dir: 1, op: 0.55 },
];

function Rings({ rings, hidden }: { rings: typeof LIGHT_RINGS; hidden?: boolean }) {
  return (
    <>
      {rings.map((r, i) => {
        const bg = i < 2
          ? `conic-gradient(from ${r.from}, transparent 0deg, ${r.primary} ${i === 0 ? '90deg' : '120deg'}, ${r.faded} ${i === 0 ? '180deg' : '240deg'}, transparent 360deg)`
          : `conic-gradient(from ${r.from}, transparent 0deg, ${r.primary} ${i === 2 ? '45deg' : '20deg'}, transparent ${i === 2 ? '90deg' : '40deg'})`;
        const mask = `radial-gradient(circle at 50% 50%, transparent ${r.maskI}, black calc(${r.maskI} + 2%), black calc(${r.maskO} - 2%), transparent ${r.maskO})`;
        return (
          <motion.div
            key={i}
            animate={{ rotate: [0, 360 * r.dir] }}
            className={cn('absolute inset-0 rounded-full', hidden ? 'hidden dark:block' : 'dark:hidden')}
            style={{ background: bg, mask, WebkitMask: mask, opacity: r.op }}
            transition={{ duration: r.dur, repeat: Infinity, ease: i % 2 === 0 ? 'linear' : [0.4, 0, 0.6, 1] }}
          />
        );
      })}
    </>
  );
}

export default function Loader({
  title = 'Loading your data...',
  subtitle = 'Please wait while we prepare your recovery information',
  size = 'md',
  className,
  ...props
}: LoaderProps) {
  const cfg = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-8 p-8', className)} {...props}>
      {/* Spinning rings */}
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        className={cn('relative', cfg.container)}
        transition={{ duration: 4, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
      >
        {/* Light mode rings */}
        <Rings rings={LIGHT_RINGS} />
        {/* Dark mode rings */}
        <Rings rings={DARK_RINGS} hidden />

        {/* Centre glow dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="h-2 w-2 rounded-full bg-[var(--mahogany)] shadow-[0_0_8px_var(--mahogany)]" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        className={cn('text-center', cfg.spacing, cfg.maxWidth)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 1, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.h2
          className={cn(cfg.titleClass, 'text-[var(--dark-brown)] tracking-[-0.02em] antialiased')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [null, 0.9, 0.7, 0.9] }}
          transition={{ delay: 0.6, duration: 3, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
        >
          {title}
        </motion.h2>
        <motion.p
          className={cn(cfg.subtitleClass, 'text-[var(--walnut)] tracking-[-0.01em] antialiased')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [null, 0.6, 0.4, 0.6] }}
          transition={{ delay: 0.8, duration: 4, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
        >
          {subtitle}
        </motion.p>
      </motion.div>
    </div>
  );
}
