'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  IconCheck,
  IconBrandWhatsapp,
  IconPhone,
  IconFileText,
  IconArrowRight,
  IconLock,
} from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce, wordItem, scaleIn } from './motion';
import { TextAnimate } from '@/registry/magicui/text-animate';
import LightRays from './LightRays';

const line1Words = ['Stop', 'chasing', 'payments.'];
const line2Start = 'Start';
const line2Highlight = 'recovering cash.';

const trustItems = [
  'No setup fees',
  'Works with any Excel format',
  'Hindi + English supported',
  'WhatsApp + Voice + PDF',
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
    setMounted(true);
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
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const mockupY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const mockupScale = useTransform(scrollYProgress, [0, 1], [1, 0.97]);

  const [visibleActivities, setVisibleActivities] = useState<number[]>([]);

  useEffect(() => {
    const timers = activityFeed.map((_, i) =>
      setTimeout(() => setVisibleActivities((prev) => [...prev, i]), 600 + i * 500)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[var(--cream)] px-5 pb-32 sm:px-8 sm:pb-40 lg:pb-44"
      style={{ paddingTop: '148px' }}
    >
      <Particles />
      {/* Light rays from top-center, follow cursor */}
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
        <motion.div variants={itemVariants} className="mb-10 flex justify-center">
          <motion.div whileHover={{ scale: 1.04 }} className="pill-beam">
            <div className="relative z-10 inline-flex items-center gap-2.5 rounded-full border border-[rgba(221,184,146,0.28)] bg-[rgba(159,99,68,0.10)] px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--rust)] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--rust)]" />
              </span>
              <span className="font-body text-xs font-semibold text-[var(--mahogany)]">
                Built for Indian Businesses
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Headline — line 1 char-by-char, line 2 whole-phrase for gradient to work */}
        <h1
          className="mx-auto max-w-4xl text-center font-display font-bold leading-[1.1] tracking-[-0.03em] text-[var(--dark-warm)]"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}
        >
          {/* Line 1 */}
          <span className="block">
            <TextAnimate animation="blurInUp" by="character" once stagger={0.024}>
              {line1Words.join(' ')}
            </TextAnimate>
          </span>
          {/* Line 2 — explicit delays so animation is clearly visible after line 1 */}
          <span className="block mt-1">
            <motion.span
              className="inline-block mr-[0.3em]"
              initial={{ opacity: 0, y: 48, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.72, ease: [0.17, 0.67, 0.29, 1] }}
            >
              {line2Start}
            </motion.span>
            <motion.span
              className="inline-block animate-gradient-text font-bold"
              initial={{ opacity: 0, y: 48, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ delay: 0.68, duration: 0.72, ease: [0.17, 0.67, 0.29, 1] }}
            >
              {line2Highlight}
            </motion.span>
          </span>
        </h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-9 max-w-[560px] text-center font-body text-[17px] leading-[1.75] text-[var(--walnut)]"
        >
          Upload your outstanding Excel once. PraecisAI makes AI Hindi voice calls,
          sends WhatsApp reminders, and delivers branded PDFs — automatically — so
          you stop chasing and start collecting.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="#demo"
              className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--mahogany)] px-7 py-3.5 font-display text-[15px] font-semibold text-[var(--cream)] shadow-[0_4px_20px_rgba(127,85,57,0.3)] transition-all duration-200 hover:bg-[var(--rust)] hover:shadow-[0_6px_28px_rgba(156,102,68,0.35)]"
            >
              Start recovering for free
              <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <a
              href="#how-it-works"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-[var(--caramel)] px-7 py-3.5 font-display text-[15px] font-semibold text-[var(--mahogany)] transition-all duration-200 hover:bg-[var(--sand)] hover:border-[var(--walnut)]"
            >
              See how it works
            </a>
          </motion.div>
        </motion.div>

        {/* Trust row */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
          {trustItems.map((item, i) => (
            <motion.span
              key={item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-[var(--walnut)]"
            >
              <IconCheck size={13} className="text-[var(--mahogany)]" stroke={2.5} />
              {item}
            </motion.span>
          ))}
        </div>

        {/* ── Dashboard Mockup ── */}
        <motion.div
          variants={scaleIn}
          style={{ y: mockupY, scale: mockupScale }}
          className="mt-20 sm:mt-24"
        >
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
            <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr_1fr] lg:p-8">

              {/* Left column */}
              <div className="flex flex-col gap-5">
                {/* Metric cards */}
                <div className="grid grid-cols-2 gap-4">
                  {metrics.map((m) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={viewportOnce}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(127,85,57,0.12)' }}
                      className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-4 text-left transition-shadow duration-200"
                    >
                      <p className={`font-display text-xl font-bold ${m.colorClass}`}>
                        <AnimatedCounter value={m.value} suffix={m.suffix} prefix={m.prefix} />
                      </p>
                      <p className="mt-1 font-body text-[11px] leading-tight text-[var(--walnut)]">
                        {m.label}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Aging bars */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportOnce}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-5"
                >
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
                          <motion.div
                            className="h-full rounded-full bg-[var(--mahogany)]"
                            initial={{ width: 0 }}
                            whileInView={{ width: bar.width }}
                            viewport={viewportOnce}
                            transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                            style={{ opacity: bar.opacity }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Right column — activity feed */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-5"
              >
                <p className="mb-4 font-display text-[13px] font-semibold text-[var(--mahogany)]">
                  Live activity
                </p>
                <div className="space-y-3">
                  {activityFeed.map((item, i) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: -16, scale: 0.95 }}
                      animate={
                        visibleActivities.includes(i)
                          ? { opacity: 1, x: 0, scale: 1 }
                          : { opacity: 0, x: -16, scale: 0.95 }
                      }
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
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
                    </motion.div>
                  ))}
                </div>
              </motion.div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
