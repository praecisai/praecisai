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
  // Vertical inset only: a bare '-60px' also shrinks the detection box
  // horizontally, so narrow text near a screen edge would never trigger.
  const inView = useInView(ref, { once, margin: '-60px 0px' });

  const defaultStagger = by === 'character' ? 0.028 : 0.1;
  const gap = stagger ?? defaultStagger;

  const variant = VARIANTS[animation];

  const charSpan = (char: string, i: number) => (
    <motion.span
      key={`${char}-${i}`}
      aria-hidden
      className="inline-block"
      custom={delay + i * gap}
      variants={variant}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      {char}
    </motion.span>
  );

  // Per-character animation needs one inline-block per letter, but a line can
  // break between any two inline-blocks — which splits words mid-word on narrow
  // screens ("paymen / ts"). Keeping each word's letters in a nowrap wrapper
  // preserves the letter-by-letter animation while restoring word-safe wrapping.
  if (by === 'character') {
    let charIndex = 0;
    return (
      <span ref={ref} className={cn('inline', className)} aria-label={children}>
        {children.split(/(\s+)/).map((token, t) => {
          if (token === '') return null;
          if (/^\s+$/.test(token)) {
            charIndex += token.length;
            // A real space text node keeps the DOM readable to crawlers.
            return <span key={`s-${t}`}>{' '}</span>;
          }
          const start = charIndex;
          charIndex += token.length;
          return (
            <span key={`w-${t}`} className="inline-block whitespace-nowrap">
              {token.split('').map((c, ci) => charSpan(c, start + ci))}
            </span>
          );
        })}
      </span>
    );
  }

  const units: string[] = by === 'word' ? children.split(/(\s+)/) : [children];

  return (
    <span ref={ref} className={cn('inline', className)} aria-label={children}>
      {units.map((unit, i) => {
        if (/^\s+$/.test(unit) && by === 'word') {
          return <span key={i}>{unit}</span>;
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
