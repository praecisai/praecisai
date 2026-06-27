'use client';

import { motion, useInView, type Variants } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils/cn';

type AnimationType = 'blurInUp' | 'fadeIn' | 'slideUp' | 'scaleIn';
type ByType = 'character' | 'word' | 'line';

interface TextAnimateProps {
  children: string;
  animation?: AnimationType;
  by?: ByType;
  once?: boolean;
  className?: string;
  /** Base delay in seconds before the whole sequence starts */
  delay?: number;
  /** Gap between each unit in seconds */
  stagger?: number;
}

const VARIANTS: Record<AnimationType, Variants> = {
  blurInUp: {
    hidden: { opacity: 0, y: 24, filter: 'blur(10px)' },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { delay: i, duration: 0.55, ease: [0.17, 0.67, 0.29, 1] },
    }),
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: (i) => ({
      opacity: 1,
      transition: { delay: i, duration: 0.5, ease: 'easeOut' },
    }),
  },
  slideUp: {
    hidden: { opacity: 0, y: 32 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    }),
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.7 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: i, duration: 0.45, ease: 'backOut' },
    }),
  },
};

export function TextAnimate({
  children,
  animation = 'blurInUp',
  by = 'character',
  once = true,
  className,
  delay = 0,
  stagger,
}: TextAnimateProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, margin: '-60px' });

  const defaultStagger = by === 'character' ? 0.028 : 0.1;
  const gap = stagger ?? defaultStagger;

  const units: string[] =
    by === 'character'
      ? children.split('')
      : by === 'word'
      ? children.split(/(\s+)/)
      : [children];

  const variant = VARIANTS[animation];

  return (
    <span ref={ref} className={cn('inline', className)} aria-label={children}>
      {units.map((unit, i) => {
        // preserve whitespace visually
        if (unit.trim() === '' && by === 'character') {
          return <span key={i} style={{ display: 'inline-block', width: '0.3em' }} aria-hidden />;
        }
        if (/^\s+$/.test(unit) && by === 'word') {
          return <span key={i} style={{ display: 'inline-block', width: '0.28em' }} aria-hidden />;
        }
        return (
          <motion.span
            key={`${unit}-${i}`}
            aria-hidden
            className="inline-block"
            custom={delay + i * gap}
            variants={variant}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            {unit}
          </motion.span>
        );
      })}
    </span>
  );
}
