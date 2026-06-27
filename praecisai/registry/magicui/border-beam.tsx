'use client';

import { cn } from '@/lib/utils/cn';
import type { CSSProperties } from 'react';

interface BorderBeamProps {
  className?: string;
  /** Size of the beam head in px */
  size?: number;
  /** Duration of one full loop in seconds */
  duration?: number;
  /** Border width in px */
  borderWidth?: number;
  /** Start colour of the gradient (usually transparent) */
  colorFrom?: string;
  /** End / peak colour of the beam */
  colorTo?: string;
  /** Delay before the animation starts (negative = offset into the loop) */
  delay?: number;
  /** Anchor percentage along the beam gradient */
  anchor?: number;
}

export function BorderBeam({
  className,
  size = 100,
  duration = 8,
  borderWidth = 1.5,
  colorFrom = 'transparent',
  colorTo = 'rgba(221,184,146,0.9)',
  delay = 0,
  anchor = 90,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          '--size': size,
          '--duration': duration,
          '--border-width': borderWidth,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--delay': `-${delay}s`,
          '--anchor': anchor,
        } as CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',
        '[border:calc(var(--border-width)*1px)_solid_transparent]',
        // Mask: intersect of two solid masks = only the border ring is visible
        '[mask-clip:padding-box,border-box]',
        '[mask-composite:intersect]',
        '[mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',
        // The beam itself travels via offset-path
        'after:absolute after:aspect-square',
        'after:w-[calc(var(--size)*1px)]',
        'after:animate-[border-beam_calc(var(--duration)*1s)_infinite_linear]',
        'after:[animation-delay:var(--delay)]',
        'after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]',
        'after:[offset-anchor:calc(var(--anchor)*1%)_50%]',
        'after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]',
        className,
      )}
    />
  );
}
