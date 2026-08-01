'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconThumbUp,
  IconThumbDown,
  IconEye,
  IconMoodSmile,
  IconAlertCircle,
  IconTrendingUp,
  IconTool,
  IconShieldLock,
  IconMapPin,
  IconBolt,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

// The signup form drags in react-hook-form + zod (~130 KB). It sits far below
// the fold, so it is loaded in the browser only, after the page is interactive.
const DemoSignupForm = dynamic(() => import('../demo/DemoSignupForm'), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-[var(--sand)]" />,
});

type FilterTab = 'all' | 'employees' | 'owners';

const reports = [
  {
    id: 'positive',
    category: 'employees' as const,
    icon: IconThumbUp,
    title: 'Positive response report',
    frequency: 'Weekly',
    description: 'Track all parties who responded positively to outreach this week.',
  },
  {
    id: 'negative',
    category: 'employees' as const,
    icon: IconThumbDown,
    title: 'Negative response report',
    frequency: 'Weekly',
    description: 'Identify parties who disputed, ignored, or refused for escalation.',
  },
  {
    id: 'seen',
    category: 'employees' as const,
    icon: IconEye,
    title: 'Seen / unseen report',
    frequency: 'Weekly',
    description: 'WhatsApp read receipts consolidated - know who read but didn\'t reply.',
  },
  {
    id: 'sentiment',
    category: 'employees' as const,
    icon: IconMoodSmile,
    title: 'Sentiment & calling report',
    frequency: 'Weekly',
    description: 'AI-analyzed sentiment across all calls and messages this week.',
  },
  {
    id: 'critical',
    category: 'owners' as const,
    icon: IconAlertCircle,
    title: 'Critical account report',
    frequency: 'Weekly Mondays',
    description: 'Every account above ₹3L or 200+ days, delivered to your WhatsApp every Monday.',
  },
  {
    id: 'recovery',
    category: 'owners' as const,
    icon: IconTrendingUp,
    title: 'Overall recovery review',
    frequency: 'Weekly summary',
    description: 'Full week performance - total recovered, promises kept, outstanding movement.',
  },
];

const trustSignals = [
  { icon: IconShieldLock, text: 'Bank-grade security' },
  { icon: IconMapPin, text: 'Data never leaves India' },
  { icon: IconBolt, text: 'Live in 10 minutes' },
];

const tabs: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All reports' },
  { id: 'employees', label: 'For Employees' },
  { id: 'owners', label: 'For Owners' },
];

export default function ReportsSection() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredReports = reports.filter(
    (report) => activeTab === 'all' || report.category === activeTab,
  );

  return (
    <section id="reports" className="bg-[var(--cream)] px-4 py-16 sm:px-8 sm:py-36 text-center">
      <motion.div
        className="mx-auto w-full max-w-7xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Eyebrow + heading */}
        <motion.p
          variants={itemVariants}
          className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rust)]"
        >
          Reports
        </motion.p>
        <motion.h2
          variants={itemVariants}
          className="text-[1.5rem] sm:text-[clamp(1.75rem,4vw,2.625rem)] text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
        >
          Reports built for every role in your business
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-5 max-w-2xl text-center font-body text-[15px] leading-relaxed text-[var(--walnut)]"
        >
          From daily agent performance to weekly owner summaries, every report is automatic,
          accurate, and on time.
        </motion.p>

        {/* Filter tabs */}
        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-wrap justify-center gap-2.5"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-full px-5 py-2.5 font-body text-sm font-medium transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-[var(--mahogany)] text-[var(--cream)] shadow-[0_4px_16px_rgba(127,85,57,0.25)]'
                  : 'border border-[var(--caramel)] bg-[var(--surface-warm)] text-[var(--walnut)] hover:bg-[var(--sand)] hover:border-[var(--walnut)]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Report cards */}
        {/* 2-up from 360px; narrower than that the cards become cramped slivers */}
        <motion.div layout className="mt-8 sm:mt-12 grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="spotlight-card rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-4 sm:p-7 text-left"
              >
                {/* Icon + frequency row */}
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[var(--sand)]">
                    <report.icon className="h-4 w-4 sm:h-6 sm:w-6 text-[var(--mahogany)]" stroke={1.5} />
                  </div>
                  <span className="rounded-full border border-[var(--caramel)] bg-[var(--cream)] px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-wide text-[var(--walnut)]">
                    {report.frequency}
                  </span>
                </div>
                <h3 className="mt-2 sm:mt-0 font-display text-[13px] sm:text-[16px] font-semibold text-[var(--dark-brown)]">
                  {report.title}
                </h3>
                <p className="mt-1.5 sm:mt-2.5 font-body text-[11px] sm:text-[13px] leading-[1.6] text-[var(--walnut)]">
                  {report.description}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Demo Signup Form — anchor on static div so scroll lands correctly */}
        <div id="demo" style={{ scrollMarginTop: '80px' }} />
        <motion.div
          variants={itemVariants}
          className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-3xl border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-xl"
        >
          <div className="bg-[var(--sand)] px-6 py-6 sm:px-8 border-b border-[var(--caramel)]">
            <h3 className="font-display text-xl font-semibold text-[var(--dark-brown)] text-center sm:text-left">
              Experience the platform live
            </h3>
            <p className="mt-1 font-body text-[14px] text-[var(--walnut)] text-center sm:text-left">
              Try 2 live AI actions (WhatsApp/Voice Call) on our interactive demo dashboard.
            </p>

            {/* Trust signals sit right at the decision point */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:gap-x-5 sm:gap-y-2 border-t border-[var(--caramel)]/60 pt-4 sm:justify-start">
              {trustSignals.map((signal) => (
                <span
                  key={signal.text}
                  className="inline-flex items-center gap-1 sm:gap-1.5 font-body text-[11px] sm:text-[12px] font-medium text-[var(--dark-brown)]/80"
                >
                  <signal.icon size={14} stroke={1.9} className="text-[var(--mahogany)]" />
                  {signal.text}
                </span>
              ))}
            </div>
          </div>
          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <DemoSignupForm />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
