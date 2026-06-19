'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  IconCheck,
  IconBrandWhatsapp,
  IconPhone,
  IconFileText,
  IconArrowRight,
  IconLock,
} from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

const trustItems = [
  'No setup fees',
  'Works with any Excel format',
  'Hindi + English supported',
  'WhatsApp + Voice + PDF',
];

const activityFeed = [
  { icon: IconBrandWhatsapp, text: 'WhatsApp sent to 59 COLOURS', time: '2m ago', color: '#4A7C59' },
  { icon: IconPhone,         text: 'Call placed to AAKARSHAN PRATHAM', time: '8m ago', color: '#7F5539' },
  { icon: IconFileText,      text: 'PDF statement delivered to SHREE FABRICS', time: '14m ago', color: '#9C6644' },
  { icon: IconCheck,         text: 'Promise logged: ₹1.2L on Friday', time: '22m ago', color: '#4A7C59' },
];

const agingBars = [
  { label: '0–60 days',    width: '62%', amount: '₹19.8L', opacity: 1 },
  { label: '61–120 days',  width: '44%', amount: '₹13.2L', opacity: 0.8 },
  { label: '121–180 days', width: '28%', amount: '₹8.5L',  opacity: 0.6 },
  { label: '181+ days',    width: '18%', amount: '₹5.7L',  opacity: 0.45 },
];

const metrics = [
  { value: '₹47.2L', label: 'Total Outstanding',    colorClass: 'text-[var(--mahogany)]' },
  { value: '1,247',  label: 'Parties tracked',       colorClass: 'text-[var(--dark-brown)]' },
  { value: '68%',    label: 'Recovery rate',         colorClass: 'text-[var(--rust)]' },
  { value: '₹12.4L', label: 'Recovered this month', colorClass: 'text-[var(--recovery-green)]' },
];

export default function HeroSection() {
  return (
    <section
      className="relative bg-[var(--cream)] px-5 pb-32 sm:px-8 sm:pb-40 lg:pb-44"
      style={{ paddingTop: '160px' }}
    >
      {/* Subtle radial glow at center-top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px] w-full"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(156,102,68,0.09) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="relative mx-auto w-full max-w-7xl text-center"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="mb-10 flex justify-center"
        >
        <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--caramel)] bg-[rgba(159,99,68,0.10)] px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--rust)] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--rust)]" />
          </span>
          <span className="font-body text-xs font-semibold text-[var(--mahogany)]">
            Built for Indian Businesses
          </span>
        </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="mx-auto max-w-4xl text-center font-display font-bold leading-[1.06] tracking-[-0.03em] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}
        >
          Your outstanding report,
          <br />
          collected{' '}
          <span className="text-[var(--rust)] wavy-underline">automatically</span>.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-9 max-w-[560px] text-center font-body text-[17px] leading-[1.75] text-[var(--walnut)]"
        >
          Upload your Excel file. PraecisAI sends WhatsApp reminders, branded PDF
          statements, and natural Hindi voice calls to recover dues your team has
          been chasing for months.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="#demo"
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--mahogany)] px-7 py-3.5 font-display text-[15px] font-semibold text-[var(--cream)] shadow-[0_4px_20px_rgba(127,85,57,0.3)] transition-all duration-200 hover:bg-[var(--rust)] hover:shadow-[0_6px_28px_rgba(156,102,68,0.35)]"
          >
            Start recovering for free
            <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-[var(--caramel)] px-7 py-3.5 font-display text-[15px] font-semibold text-[var(--mahogany)] transition-all duration-200 hover:bg-[var(--sand)] hover:border-[var(--walnut)]"
          >
            See how it works
          </a>
        </motion.div>

        {/* Trust row */}
        <motion.div
          variants={itemVariants}
          className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5"
        >
          {trustItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-[var(--walnut)]"
            >
              <IconCheck size={13} className="text-[var(--mahogany)]" stroke={2.5} />
              {item}
            </span>
          ))}
        </motion.div>

        {/* ── Dashboard Mockup ── */}
        <motion.div variants={itemVariants} className="mt-20 sm:mt-24">
          <div className="animate-float-mockup mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-[0_24px_80px_rgba(127,85,57,0.14)]">

            {/* Browser bar */}
            <div className="flex items-center justify-between border-b border-[var(--caramel)] bg-[var(--sand)] px-5 py-3">
              <div className="flex w-16 gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                <span className="h-3 w-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex max-w-[220px] flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--surface-warm)]/70 px-3 py-1.5">
                <IconLock size={10} className="text-[var(--walnut)]" stroke={1.75} />
                <span className="font-body text-[11px] text-[var(--walnut)]">app.praecisai.in</span>
              </div>
              <div className="w-16" />
            </div>

            {/* Dashboard content */}
            <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr_1fr] lg:p-8">

              {/* Left column */}
              <div className="flex flex-col gap-5">
                {/* Metric cards */}
                <div className="grid grid-cols-2 gap-4">
                  {metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-4 text-left"
                    >
                      <p className={`font-display text-xl font-bold ${m.colorClass}`}>
                        {m.value}
                      </p>
                      <p className="mt-1 font-body text-[11px] leading-tight text-[var(--walnut)]">
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Aging bars */}
                <div className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-5">
                  <p className="mb-4 font-display text-[13px] font-semibold text-[var(--mahogany)]">
                    Aging breakdown
                  </p>
                  <div className="space-y-3.5">
                    {agingBars.map((bar) => (
                      <div key={bar.label}>
                        <div className="mb-1.5 flex justify-between font-body text-[11px] text-[var(--walnut)]">
                          <span>{bar.label}</span>
                          <span className="font-semibold">{bar.amount}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--sand)]">
                          <div
                            className="h-full rounded-full bg-[var(--mahogany)]"
                            style={{ width: bar.width, opacity: bar.opacity }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column — activity feed */}
              <div className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-5">
                <p className="mb-4 font-display text-[13px] font-semibold text-[var(--mahogany)]">
                  Live activity
                </p>
                <div className="space-y-3">
                  {activityFeed.map((item) => (
                    <div
                      key={item.text}
                      className="flex items-start gap-3 rounded-lg bg-[var(--surface-warm)] px-3 py-2.5 shadow-[0_1px_4px_rgba(127,85,57,0.07)]"
                    >
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: `${item.color}18` }}
                      >
                        <item.icon size={15} style={{ color: item.color }} stroke={1.75} />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-body text-[12px] leading-snug text-[var(--dark-brown)]">
                          {item.text}
                        </p>
                        <p className="mt-0.5 font-body text-[10px] text-[var(--walnut)]">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
