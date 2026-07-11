'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconThumbUp,
  IconThumbDown,
  IconEye,
  IconMoodSmile,
  IconAlertCircle,
  IconTrendingUp,
  IconTool,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';
import { itemVariants, sectionVariants, viewportOnce } from './motion';
import DemoSignupForm from '../demo/DemoSignupForm';

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
    <section id="reports" className="bg-[var(--cream)] px-5 py-28 sm:px-8 sm:py-36 text-center">
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
          className="text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
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
        <motion.div layout className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="spotlight-card rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-7"
              >
                {/* Icon + frequency row */}
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--sand)]">
                    <report.icon className="h-6 w-6 text-[var(--mahogany)]" stroke={1.5} />
                  </div>
                  <span className="rounded-full border border-[var(--caramel)] bg-[var(--cream)] px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-wide text-[var(--walnut)]">
                    {report.frequency}
                  </span>
                </div>
                <h3 className="font-display text-[16px] font-semibold text-[var(--dark-brown)]">
                  {report.title}
                </h3>
                <p className="mt-2.5 font-body text-[13px] leading-[1.7] text-[var(--walnut)]">
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
          <div className="bg-[var(--sand)] px-8 py-6 border-b border-[var(--caramel)]">
            <h3 className="font-display text-xl font-semibold text-[var(--dark-brown)] text-center sm:text-left">
              Experience the platform live
            </h3>
            <p className="mt-1 font-body text-[14px] text-[var(--walnut)] text-center sm:text-left">
              Try 2 live AI actions (WhatsApp/Voice Call) on our interactive demo dashboard.
            </p>
          </div>
          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <DemoSignupForm />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
