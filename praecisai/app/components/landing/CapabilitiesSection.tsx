'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import createGlobe, { type COBEOptions } from 'cobe';
import { motion } from 'framer-motion';
import {
  IconPhone,
  IconBrandWhatsapp,
  IconFileText,
  IconCheck,
  IconCalendarEvent,
  IconChartBar,
  IconTrendingUp,
  IconCoin,
} from '@tabler/icons-react';

// ── Feature grid layout ──────────────────────────────────────────────
const features = [
  {
    title: 'AI calls that collect — in natural Hindi',
    description:
      'PraecisAI makes voice calls that sound human, negotiate in Hindi, handle objections, and log every promise automatically.',
    skeleton: <SkeletonOne />,
    className: 'col-span-1 lg:col-span-4 border-b lg:border-r border-[rgba(221,184,146,0.25)]',
  },
  {
    title: 'WhatsApp · Voice · PDF — all channels, one upload',
    description:
      'Segment debtors by aging and hit every channel simultaneously. One Excel file is all it takes.',
    skeleton: <SkeletonTwo />,
    className: 'border-b col-span-1 lg:col-span-2 border-[rgba(221,184,146,0.25)]',
  },
  {
    title: 'See PraecisAI recover dues — live demo',
    description:
      'Watch a real recovery call, WhatsApp flow, and PDF statement get sent — in under 90 seconds.',
    skeleton: <SkeletonThree />,
    className: 'col-span-1 lg:col-span-3 lg:border-r border-[rgba(221,184,146,0.25)]',
  },
  {
    title: 'Built for every corner of India',
    description:
      'From Mumbai to Chennai — built for every Indian MSME.',
    skeleton: <SkeletonFour />,
    className: 'col-span-1 lg:col-span-3',
  },
];

export default function CapabilitiesSection() {
  return (
    <section className="bg-[var(--cream)] px-5 py-20 sm:px-8 sm:py-28" id="capabilities">
      <div className="relative z-20 mx-auto max-w-7xl">
        {/* Header */}
        <div className="px-4 text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-[var(--rust)]">
            Platform Capabilities
          </p>
          <h2 className="mx-auto max-w-4xl font-display text-[clamp(1.9rem,4vw,3.2rem)] font-bold leading-tight tracking-[-0.02em] text-[var(--dark-warm)]">
            Everything your collections team needs — automated
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-[16px] leading-relaxed text-[var(--walnut)]">
            Upload once. PraecisAI handles every follow-up — AI calls, WhatsApp reminders,
            branded PDFs and promise tracking — while your team focuses on closing.
          </p>
        </div>

        {/* Grid */}
        <div className="relative mt-14">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[rgba(221,184,146,0.3)] lg:grid-cols-6 dark:border-[rgba(221,184,146,0.15)]">
            {features.map((f) => (
              <FeatureCard key={f.title} className={f.className}>
                <FeatureTitle>{f.title}</FeatureTitle>
                <FeatureDescription>{f.description}</FeatureDescription>
                <div className="flex flex-1 flex-col">{f.skeleton}</div>
              </FeatureCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Shared card shells ────────────────────────────────────────────────
function FeatureCard({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative flex flex-col p-6 sm:p-8 bg-[rgba(255,253,249,0.5)] dark:bg-[rgba(10,6,3,0.6)]', className)}>
      {children}
    </div>
  );
}
function FeatureTitle({ children }: { children?: React.ReactNode }) {
  return (
    <p className="max-w-5xl text-left font-display text-xl font-semibold tracking-tight text-[var(--dark-warm)] md:text-2xl">
      {children}
    </p>
  );
}
function FeatureDescription({ children }: { children?: React.ReactNode }) {
  return (
    <p className="my-2 max-w-sm text-left font-body text-sm leading-relaxed text-[var(--walnut)]">
      {children}
    </p>
  );
}

// ── Skeleton 1: Live AI call interface ───────────────────────────────
function SkeletonOne() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'Dialling…', color: 'text-[var(--walnut)]' },
    { label: 'Connected · AI speaking', color: 'text-[var(--recovery-green)]' },
    { label: 'Promise logged ✓', color: 'text-[var(--recovery-green)]' },
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1400);
    const t2 = setTimeout(() => setStep(2), 4000);
    const t3 = setTimeout(() => setStep(0), 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [step]);

  const waveHeights = [12, 22, 35, 28, 18, 40, 32, 20, 38, 26, 14, 30, 42, 24, 16, 36, 28, 18, 34, 22];

  return (
    <div className="relative flex h-full flex-col gap-4 py-6">
      {/* Call card */}
      <div className="mx-auto w-full max-w-xs rounded-2xl border border-[rgba(221,184,146,0.3)] bg-[rgba(255,253,249,0.9)] p-5 shadow-[0_8px_32px_rgba(127,85,57,0.1)] dark:bg-[rgba(18,9,3,0.88)] dark:border-[rgba(221,184,146,0.18)]">
        {/* Caller */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mahogany)]">
            <IconPhone size={18} stroke={1.75} className="text-[var(--cream)]" />
          </div>
          <div className="flex-1">
            <p className="font-display text-[13px] font-bold text-[var(--dark-warm)]">MEHTA TRADERS</p>
            <p className="font-body text-[10px] text-[var(--walnut)]">₹2.4L · 90 days overdue</p>
          </div>
          <span className={cn('rounded-full px-2 py-0.5 font-body text-[10px] font-semibold', step === 0 ? 'bg-[rgba(221,184,146,0.15)] text-[var(--walnut)]' : 'bg-[rgba(74,124,89,0.12)] text-[var(--recovery-green)]')}>
            {steps[step].label}
          </span>
        </div>

        {/* Waveform */}
        <div className="flex h-12 items-center justify-center gap-[3px]">
          {waveHeights.map((h, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-[var(--mahogany)]"
              animate={step === 1 ? { height: [h * 0.4, h, h * 0.6, h * 0.9, h * 0.4], opacity: [0.5, 1, 0.7, 1, 0.5] } : { height: 4, opacity: 0.25 }}
              transition={{ duration: 0.8 + i * 0.04, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
            />
          ))}
        </div>

        {/* Promise box */}
        <motion.div
          className="mt-4 rounded-xl bg-[rgba(74,124,89,0.1)] p-3"
          animate={{ opacity: step === 2 ? 1 : 0, y: step === 2 ? 0 : 8 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <IconCheck size={14} className="text-[var(--recovery-green)]" stroke={2.5} />
            <p className="font-body text-[11px] font-semibold text-[var(--recovery-green)]">
              Promise: ₹2.4L by Friday · Follow-up auto-scheduled
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(255,253,249,0.9)] to-transparent dark:from-[rgba(10,6,3,0.8)]" />
    </div>
  );
}

// ── Skeleton 2: Channel cards staggered ─────────────────────────────
function SkeletonTwo() {
  const channels = [
    { icon: IconBrandWhatsapp, label: 'WhatsApp', sub: 'Personalised reminder', color: '#4A7C59', bg: 'rgba(74,124,89,0.1)' },
    { icon: IconPhone,          label: 'AI Voice',  sub: 'Hindi · Natural',       color: '#7F5539', bg: 'rgba(127,85,57,0.1)' },
    { icon: IconFileText,       label: 'PDF',       sub: 'Branded statement',     color: '#9C6644', bg: 'rgba(156,102,68,0.1)' },
    { icon: IconCalendarEvent,  label: 'Tracker',   sub: 'Promise follow-up',     color: '#B08968', bg: 'rgba(176,137,104,0.1)' },
    { icon: IconChartBar,       label: 'Reports',   sub: 'Owner dashboard',       color: '#7F5539', bg: 'rgba(127,85,57,0.1)' },
  ];

  const row1 = channels.slice(0, 3);
  const row2 = channels.slice(2);

  const card = (ch: typeof channels[0], key: string, rotate: number) => (
    <motion.div
      key={key}
      style={{ rotate }}
      whileHover={{ scale: 1.08, rotate: 0, zIndex: 50 }}
      className="-mr-3 mt-3 shrink-0 cursor-pointer rounded-2xl border border-[rgba(221,184,146,0.3)] bg-[rgba(255,253,249,0.92)] p-3 shadow-md dark:bg-[rgba(18,9,3,0.88)] dark:border-[rgba(221,184,146,0.18)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: ch.bg }}>
        <ch.icon size={20} stroke={1.75} style={{ color: ch.color }} />
      </div>
      <p className="mt-1.5 font-display text-[11px] font-semibold text-[var(--dark-warm)]">{ch.label}</p>
      <p className="font-body text-[9px] text-[var(--walnut)]">{ch.sub}</p>
    </motion.div>
  );

  return (
    <div className="relative flex h-full flex-col items-start gap-2 overflow-hidden py-6 pl-4">
      <div className="-ml-4 flex flex-row">{row1.map((ch, i) => card(ch, `r1-${i}`, (i - 1) * 6))}</div>
      <div className="flex flex-row">{row2.map((ch, i) => card(ch, `r2-${i}`, (i - 1) * 6))}</div>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[rgba(255,253,249,0.9)] to-transparent dark:from-[rgba(10,6,3,0.8)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[rgba(255,253,249,0.9)] to-transparent dark:from-[rgba(10,6,3,0.8)]" />
    </div>
  );
}

// ── Skeleton 3: Mini recovery dashboard ─────────────────────────────
const BARS = [42, 58, 71, 65, 83, 91, 100];
const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const FEED = [
  { icon: IconBrandWhatsapp, text: 'WhatsApp sent to 59 COLOURS', time: '2m ago', color: '#4A7C59' },
  { icon: IconPhone,          text: 'AI call placed — AAKARSHAN', time: '8m ago', color: '#7F5539' },
  { icon: IconCheck,          text: 'Promise ₹1.2L logged — Fri', time: '14m ago', color: '#4A7C59' },
];

function SkeletonThree() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgba(221,184,146,0.2)] bg-[rgba(10,6,3,0.82)] py-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(221,184,146,0.1)] px-4 pb-3">
        <span className="font-body text-[9px] font-semibold uppercase tracking-[0.18em] text-[rgba(176,137,104,0.6)]">Recovery Intelligence</span>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4A7C59]" style={{ boxShadow: '0 0 6px #4A7C59' }} />
          <span className="font-body text-[8px] uppercase tracking-wider text-[rgba(176,137,104,0.5)]">AI Active</span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[rgba(221,184,146,0.1)]">
        {/* Bar chart */}
        <div className="px-4 pt-3">
          <p className="mb-2 font-body text-[8px] uppercase tracking-[0.15em] text-[rgba(176,137,104,0.45)]">Monthly Trend</p>
          <div className="flex items-end gap-[3px]" style={{ height: 44 }}>
            {BARS.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  className="w-full rounded-sm"
                  style={{ background: i === 6 ? '#DDB892' : `rgba(176,137,104,${0.3 + i * 0.1})`, boxShadow: i === 6 ? '0 0 8px rgba(221,184,146,0.5)' : 'none' }}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(h / 100) * 44}px` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: 'backOut' }}
                />
                <span className="font-body text-[6px] text-[rgba(176,137,104,0.35)]">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats + feed */}
        <div className="px-4 pt-3">
          <div className="mb-2 flex gap-2">
            <div className="flex-1 rounded-lg bg-[rgba(221,184,146,0.06)] px-2 py-1.5 text-center">
              <p className="font-display text-[14px] font-bold text-[#DDB892]">₹18Cr+</p>
              <p className="font-body text-[7px] text-[rgba(176,137,104,0.5)]">Recovered</p>
            </div>
            <div className="flex-1 rounded-lg bg-[rgba(221,184,146,0.06)] px-2 py-1.5 text-center">
              <p className="font-display text-[14px] font-bold text-[#DDB892]">68%</p>
              <p className="font-body text-[7px] text-[rgba(176,137,104,0.5)]">Rate</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {FEED.map((f, i) => (
              <motion.div key={i} className="flex items-center gap-1.5"
                initial={{ opacity: 0, x: 8 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }}>
                <f.icon size={9} style={{ color: f.color, flexShrink: 0 }} />
                <p className="truncate font-body text-[8px] text-[rgba(176,137,104,0.65)]">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton 4: COBE v2 globe — India markers ────────────────────────
function SkeletonFour() {
  return (
    <div className="flex flex-1 items-center justify-center py-4">
      <div className="sm:translate-x-8 scale-[0.72] sm:scale-100 origin-center">
        <Globe />
      </div>
    </div>
  );
}

function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const SIZE = 380;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let phi = 4.9; // 4.9 rad ≈ 2π − 1.38 ≈ 79°E longitude → India centred

    const opts: COBEOptions = {
      devicePixelRatio: dpr,
      width:         SIZE * dpr,
      height:        SIZE * dpr,
      phi,
      theta:         -0.15,
      dark:          1,
      diffuse:       1.8,
      mapSamples:    12000,
      mapBrightness: 10,
      baseColor:     [0.55, 0.35, 0.18],  // visible warm brown landmass
      markerColor:   [1.0,  0.88, 0.55],  // bright gold markers
      glowColor:     [0.8,  0.52, 0.25],
      markers: [
        { location: [19.076, 72.878], size: 0.10 }, // Mumbai
        { location: [28.614, 77.209], size: 0.09 }, // Delhi
        { location: [12.972, 77.595], size: 0.07 }, // Bangalore
        { location: [13.083, 80.271], size: 0.06 }, // Chennai
        { location: [17.385, 78.487], size: 0.06 }, // Hyderabad
        { location: [22.573, 88.364], size: 0.06 }, // Kolkata
        { location: [21.170, 72.831], size: 0.05 }, // Surat
        { location: [18.520, 73.857], size: 0.07 }, // Pune
      ],
    };

    const globe = createGlobe(canvas, opts);

    // v2 uses globe.update() + rAF for animation
    const animate = () => {
      phi += 0.004;
      globe.update({ phi });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: SIZE, height: SIZE, maxWidth: '100%', aspectRatio: '1' }}
    />
  );
}
