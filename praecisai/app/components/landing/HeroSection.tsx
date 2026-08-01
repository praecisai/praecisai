'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconCheck,
  IconBrandWhatsapp,
  IconPhone,
  IconFileText,
  IconArrowRight,
  IconLock,
} from '@tabler/icons-react';
import dynamic from 'next/dynamic';

// The rays are a WebGL canvas (ogl). Purely decorative, so it is loaded only
// in the browser and only where it is affordable: keeping `ogl` and the GL
// context off the critical path is the single biggest mobile win here.
const LightRays = dynamic(() => import('./LightRays'), { ssr: false });

/**
 * Rays are enabled only on pointer-capable screens wide enough for them, and
 * never when the visitor asked for reduced motion. Phones (where the render
 * loop costs the most and the effect is barely visible) skip it entirely.
 */
function useDecorativeRays() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
    );
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return enabled;
}

const line1 = 'Stop chasing payments.';
const line2Start = 'Start';
const line2Highlight = 'recovering cash.';

const trustItems = [
  'Bank-grade security',
  'Data never leaves India',
  'Live in 10 minutes',
  'Made for Indian MSMEs',
];

const activityFeed = [
  { icon: IconBrandWhatsapp, text: 'WhatsApp sent to 59 COLOURS', time: '2m ago', color: '#4A7C59' },
  { icon: IconPhone, text: 'Call placed to AAKARSHAN PRATHAM', time: '8m ago', color: '#7F5539' },
  { icon: IconFileText, text: 'PDF statement delivered to SHREE FABRICS', time: '14m ago', color: '#9C6644' },
  { icon: IconCheck, text: 'Promise logged: ₹1.2L on Friday', time: '22m ago', color: '#4A7C59' },
];

const agingBars = [
  { label: '0–60 days', width: '62%', amount: '₹19.8L', opacity: 1 },
  { label: '61–120 days', width: '44%', amount: '₹13.2L', opacity: 0.8 },
  { label: '121–180 days', width: '28%', amount: '₹8.5L', opacity: 0.6 },
  { label: '181+ days', width: '18%', amount: '₹5.7L', opacity: 0.45 },
];

const metrics = [
  { value: 47.2, suffix: 'L', label: 'Total Outstanding', colorClass: 'text-[var(--mahogany)]', prefix: '₹' },
  { value: 1247, suffix: '', label: 'Parties tracked', colorClass: 'text-[var(--dark-brown)]', prefix: '' },
  { value: 68, suffix: '%', label: 'Recovery rate', colorClass: 'text-[var(--rust)]', prefix: '' },
  { value: 12.4, suffix: 'L', label: 'Recovered this month', colorClass: 'text-[var(--recovery-green)]', prefix: '₹' },
];

function AnimatedCounter({
  value,
  suffix,
  prefix,
}: {
  value: number;
  suffix: string;
  prefix: string;
}) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const duration = 1800;
          const start = performance.now();
          const raf = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(value * eased);
            if (t < 1) requestAnimationFrame(raf);
          };
          requestAnimationFrame(raf);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  const formatted = value % 1 === 0
    ? Math.round(display).toString()
    : display.toFixed(1);

  return (
    <span ref={ref}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

function Particles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Decorative only: skip the 24 animating dots on phones and for
    // reduced-motion users, where they just burn main-thread time.
    const mq = window.matchMedia(
      '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
    );
    if (mq.matches) setMounted(true);
  }, []);

  const dots = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 4,
      duration: 5 + Math.random() * 5,
      opacity: 0.06 + Math.random() * 0.08,
    }));
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute rounded-full bg-[var(--walnut)]"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
            animation: `dot-drift ${dot.duration}s ease-in-out infinite`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function HeroSection() {
  const raysEnabled = useDecorativeRays();

  // sm:pt-[148px] clears the desktop floating navbar; the mobile bar is only
  // 56px tall, so phones get pt-24 instead of 148px of dead space.
  return (
    <section
      className="relative overflow-hidden bg-[var(--cream)] px-5 pt-24 pb-16 sm:px-8 sm:pt-[148px] sm:pb-40 lg:pb-44"
    >
      <Particles />
      {/* Light rays from top-center, follow cursor (desktop only) */}
      {raysEnabled && (
        <LightRays
          raysOrigin="top-center"
          raysColor="#DDB892"
          raysSpeed={0.6}
          lightSpread={0.55}
          rayLength={2.8}
          followMouse={true}
          mouseInfluence={0.09}
          noiseAmount={0}
          distortion={0}
          pulsating={false}
          fadeDistance={1}
          className="z-0"
        />
      )}

      {/* Subtle radial glow at center-top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px] w-full"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(156,102,68,0.09) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl text-center">
        {/* Badge */}
        <div className="reveal mb-6 sm:mb-10 flex justify-center" style={{ animationDelay: '0.05s' }}>
          <div className="pill-beam transition-transform duration-200 hover:scale-[1.04]">
            <div className="relative z-10 inline-flex items-center gap-2.5 rounded-full border border-[rgba(221,184,146,0.28)] bg-[rgba(159,99,68,0.10)] px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--rust)] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--rust)]" />
              </span>
              <span className="font-body text-xs font-semibold text-[var(--mahogany)]">
                Built for Indian Businesses
              </span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="text-[1.6rem] sm:text-[clamp(1.75rem,6vw,4.5rem)] mx-auto max-w-4xl text-center font-display font-bold leading-[1.1] tracking-[-0.03em] text-[var(--dark-warm)]"
        >
          {/* Line 1 */}
          <span className="reveal-blur block" style={{ animationDelay: '0.12s' }}>
            {line1}
          </span>
          {/* Line 2 */}
          <span className="block mt-1">
            <span className="reveal-blur inline-block" style={{ animationDelay: '0.35s' }}>
              {line2Start}
            </span>
            {' '}
            <span
              className="reveal-blur inline-block animate-gradient-text font-bold"
              style={{ animationDelay: '0.45s' }}
            >
              {line2Highlight}
            </span>
          </span>
          {/* Keyword line — real, spaced text inside the H1 for search crawlers */}
          <span
            className="reveal mt-5 block font-body text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.16em] text-[var(--rust)] sm:text-[13px]"
            style={{ animationDelay: '0.7s' }}
          >
            AI Calling Agent for Payment &amp; Credit Recovery
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="reveal mx-auto mt-6 sm:mt-9 max-w-[600px] text-center font-body text-[14px] sm:text-[17px] leading-[1.7] sm:leading-[1.75] text-[var(--walnut)]"
          style={{ animationDelay: '0.5s' }}
        >
          Upload your outstanding Excel once, or connect your existing software.
          PraecisAI calls and WhatsApps every customer automatically, remembers every
          promise they make, and keeps following up until you&rsquo;re paid.
        </p>

        {/* CTA Buttons */}
        <div
          className="reveal mt-8 sm:mt-12 flex flex-row items-stretch justify-center gap-2.5 sm:gap-4"
          style={{ animationDelay: '0.6s' }}
        >
          {/* flex-1 on phones so the two CTAs sit side by side instead of
              stacking as two full-width slabs; sm+ reverts to intrinsic width */}
          <Link
            href="#demo"
            className="group inline-flex flex-1 sm:flex-none w-full sm:w-auto items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-[var(--mahogany)] px-3 py-3 sm:px-7 sm:py-3.5 font-display text-[13px] sm:text-[15px] font-semibold text-[var(--cream)] shadow-[0_4px_20px_rgba(127,85,57,0.3)] transition-all duration-200 hover:bg-[var(--rust)] hover:shadow-[0_6px_28px_rgba(156,102,68,0.35)] hover:scale-[1.03] active:scale-[0.97]"
          >
            See Live Demo
            <IconArrowRight size={16} stroke={2} className="hidden sm:block transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex flex-1 sm:flex-none w-full sm:w-auto items-center justify-center rounded-xl border border-[var(--caramel)] px-3 py-3 sm:px-7 sm:py-3.5 font-display text-[13px] sm:text-[15px] font-semibold text-[var(--mahogany)] transition-all duration-200 hover:bg-[var(--sand)] hover:border-[var(--walnut)] hover:scale-[1.03] active:scale-[0.97]"
          >
            {/* Full label needs ~118px but only ~111px fits at 320px */}
            <span className="whitespace-nowrap sm:hidden">How it works</span>
            <span className="hidden sm:inline">See how it works</span>
          </a>
        </div>

        {/* Trust row */}
        {/* gap-x-7 left only room for one item per line on phones */}
        <div className="mt-6 sm:mt-9 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-7 sm:gap-y-2.5">
          {trustItems.map((item, i) => (
            <span
              key={item}
              className="reveal inline-flex items-center gap-1.5 font-body text-[12px] sm:text-[13px] font-medium text-[var(--walnut)]"
              style={{ animationDelay: `${0.7 + i * 0.08}s` }}
            >
              <IconCheck size={13} className="text-[var(--mahogany)]" stroke={2.5} />
              {item}
            </span>
          ))}
        </div>

        {/* ── Dashboard Mockup ── */}
        <figure className="reveal-scale mt-20 sm:mt-24" style={{ animationDelay: '0.3s' }}>
          <figcaption className="sr-only">
            PraecisAI dashboard showing outstanding payment ageing breakdown, recovery
            rate, and a live feed of AI voice calls and WhatsApp payment reminders.
          </figcaption>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-[0_24px_80px_rgba(127,85,57,0.14)]">

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
            <div className="grid gap-3.5 p-3.5 sm:gap-6 sm:p-6 lg:grid-cols-[1.5fr_1fr] lg:p-8">

              {/* Left column */}
              <div className="flex flex-col gap-3.5 sm:gap-5">
                {/* Metric cards */}
                <div className="grid grid-cols-2 gap-4">
                  {metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-3 sm:p-4 text-left transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(127,85,57,0.12)]"
                    >
                      <p className={`font-display text-xl font-bold ${m.colorClass}`}>
                        <AnimatedCounter value={m.value} suffix={m.suffix} prefix={m.prefix} />
                      </p>
                      <p className="mt-1 font-body text-[11px] leading-tight text-[var(--walnut)]">
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Aging bars */}
                <div className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-3.5 sm:p-5">
                  <p className="mb-2.5 sm:mb-4 font-display text-[12px] sm:text-[13px] font-semibold text-[var(--mahogany)]">
                    Aging breakdown
                  </p>
                  <div className="space-y-2.5 sm:space-y-3.5">
                    {agingBars.map((bar) => (
                      <div key={bar.label}>
                        <div className="mb-1.5 flex justify-between font-body text-[11px] text-[var(--walnut)]">
                          <span>{bar.label}</span>
                          <span className="font-semibold">{bar.amount}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--sand)]">
                          <div
                            className="bar-grow h-full rounded-full bg-[var(--mahogany)]"
                            style={{ width: bar.width, opacity: bar.opacity, animationDelay: '0.4s' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column — activity feed */}
              <div className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-3.5 sm:p-5">
                <p className="mb-2.5 sm:mb-4 font-display text-[12px] sm:text-[13px] font-semibold text-[var(--mahogany)]">
                  Live activity
                </p>
                <div className="space-y-2 sm:space-y-3">
                  {activityFeed.map((item, i) => (
                    <div
                      key={item.text}
                      className="reveal flex items-start gap-2.5 sm:gap-3 rounded-lg bg-[var(--surface-warm)] px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-[0_1px_4px_rgba(127,85,57,0.07)]"
                      style={{ animationDelay: `${0.6 + i * 0.15}s` }}
                    >
                      <div
                        className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg"
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
        </figure>
      </div>
    </section>
  );
}
