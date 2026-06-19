'use client';

import { cn } from '@/lib/utils/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
}

const sizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function Logo({ className, size = 'md', dark = true }: LogoProps) {
  return (
    <span
      className={cn(
        'font-display font-bold tracking-tight',
        sizes[size],
        dark ? 'text-[var(--dark-brown)]' : 'text-[var(--cream)]',
        className,
      )}
    >
      Praecis
      <span className="text-[var(--rust)]">AI</span>
    </span>
  );
}
