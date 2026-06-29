'use client';

import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';
import { AnimatedThemeToggler } from '../../../registry/magicui/animated-theme-toggler';

interface DemoDashboardHeaderProps {
  businessName: string;
  whatsappUsed: number;
  whatsappAllowed: number;
  callsUsed: number;
  callsAllowed: number;
}

export default function DemoDashboardHeader({ businessName, whatsappUsed, whatsappAllowed, callsUsed, callsAllowed }: DemoDashboardHeaderProps) {
  const whatsappRemaining = Math.max(0, whatsappAllowed - whatsappUsed);
  const callsRemaining = Math.max(0, callsAllowed - callsUsed);
  const whatsappDots = Array.from({ length: whatsappAllowed });
  const callsDots = Array.from({ length: callsAllowed });

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
        Welcome <span className="font-semibold text-[var(--dark-brown)]">{businessName}</span>! Here&apos;s what your dashboard will look like with your real business&apos;s data.
      </div>

      {/* Right: Counter & Action */}
      <div className="mt-4 flex items-center justify-between sm:mt-0 sm:justify-end sm:gap-6">
        <div className="flex flex-row items-center gap-6">
          {/* WhatsApp Counter */}
          <div className="flex flex-col items-end">
            <span className="font-body text-[11px] font-semibold text-[var(--dark-brown)]">
              {whatsappRemaining} WhatsApp actions remaining
            </span>
            <div className="mt-1 flex gap-1.5">
              {whatsappDots.map((_, i) => (
                <motion.div
                  key={`wa-${i}`}
                  layout
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-colors duration-500",
                    i < whatsappRemaining ? "bg-[#25D366]" : "bg-[var(--caramel)] opacity-50"
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Call Counter */}
          <div className="flex flex-col items-end">
            <span className="font-body text-[11px] font-semibold text-[var(--dark-brown)]">
              {callsRemaining} Call actions remaining
            </span>
            <div className="mt-1 flex gap-1.5">
              {callsDots.map((_, i) => (
                <motion.div
                  key={`call-${i}`}
                  layout
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-colors duration-500",
                    i < callsRemaining ? "bg-[var(--mahogany)]" : "bg-[var(--caramel)] opacity-50"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        
        <AnimatedThemeToggler />
        <Link
          href="/"
          className="ml-2 flex items-center gap-2 rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-2 font-body text-sm font-semibold text-[var(--walnut)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--dark-brown)]"
          title="Exit Demo"
        >
          <LogOut size={16} />
          Exit Demo
        </Link>
      </div>
    </div>
  );
}
