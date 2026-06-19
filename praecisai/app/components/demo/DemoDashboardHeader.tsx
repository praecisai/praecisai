'use client';

import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

interface DemoDashboardHeaderProps {
  leadName: string;
  businessName: string;
  demosUsed: number;
  demosAllowed: number;
}

export default function DemoDashboardHeader({ leadName, businessName, demosUsed, demosAllowed }: DemoDashboardHeaderProps) {
  const remaining = Math.max(0, demosAllowed - demosUsed);
  const dots = Array.from({ length: demosAllowed });

  return (
    <div className="sticky top-0 z-40 flex w-full flex-col border-b border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      
      {/* Left: Brand & Badge */}
      <div className="flex items-center gap-4">
        <h1 className="font-display text-xl font-bold tracking-tight text-[var(--dark-brown)]">
          Praecis<span className="text-[var(--walnut)]">AI</span>
        </h1>
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--rust)] px-2.5 py-1 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--surface-warm)] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--surface-warm)]"></span>
          </span>
          <span className="font-body text-[10px] font-bold uppercase tracking-wider text-[var(--cream)]">
            Demo Mode
          </span>
        </div>
      </div>

      {/* Center: Welcome Text */}
      <div className="mt-4 hidden text-center font-body text-[13px] text-[var(--walnut)] lg:block sm:mt-0">
        Welcome!<span className="font-semibold text-[var(--dark-brown)]">{leadName}</span> Here&apos;s what your dashboard will look like with your real business's data.
      </div>

      {/* Right: Counter & Action */}
      <div className="mt-4 flex items-center justify-between sm:mt-0 sm:justify-end sm:gap-6">
        <div className="flex flex-col items-start sm:items-end">
          <span className="font-body text-[12px] font-semibold text-[var(--dark-brown)]">
            {remaining} free actions remaining
          </span>
          <div className="mt-1 flex gap-1.5">
            {dots.map((_, i) => (
              <motion.div
                key={i}
                layout
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors duration-500",
                  i < remaining ? "bg-[var(--mahogany)]" : "bg-[var(--caramel)] opacity-50"
                )}
              />
            ))}
          </div>
        </div>
        
        <Link 
          href="/"
          className="ml-4 flex items-center gap-2 rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-2 font-body text-sm font-semibold text-[var(--walnut)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--dark-brown)]"
          title="Exit Demo"
        >
          <LogOut size={16} />
          Exit Demo
        </Link>
      </div>
    </div>
  );
}
