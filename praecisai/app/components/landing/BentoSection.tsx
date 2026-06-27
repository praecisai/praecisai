'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import {
  IconCheck,
  IconBrandWhatsapp,
  IconPhone,
  IconFileText,
  IconCoin,
  IconChartBar,
  IconArrowUpRight,
  IconClock,
  IconBolt,
  IconTarget,
  IconTrendingUp,
  IconUsers,
  IconCalendarEvent,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';
import { TextAnimate } from '@/registry/magicui/text-animate';

// ── Mini SVG donut ──────────────────────────────────────────────────
function Donut({ pct, size = 72, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(221,184,146,0.2)" strokeWidth={stroke} />
      <motion.circle
        cx={cx} cy={cx} r={r} fill="none" stroke="#7F5539" strokeWidth={stroke}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`}
        initial={{ strokeDasharray: `0 ${circ}` }}
        whileInView={{ strokeDasharray: `${dash} ${circ - dash}` }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
      />
      <text x={cx} y={cx + 5} textAnchor="middle" fontSize={size / 5.5} fontWeight="700" fill="#7F5539">
        {pct}%
      </text>
    </svg>
  );
}

// ── Animated bar ────────────────────────────────────────────────────
function Bar({ value, color = '#7F5539', delay = 0 }: { value: number; color?: string; delay?: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(221,184,146,0.18)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1], delay }}
      />
    </div>
  );
}

// ── Animated counter ────────────────────────────────────────────────
function Counter({ end, prefix = '', suffix = '' }: { end: number; prefix?: string; suffix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const dur = 1800;
      const raf = (now: number) => {
        const t = Math.min((now - start) / dur, 1);
        setV(end * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end]);
  const fmt = end % 1 === 0 ? Math.round(v).toString() : v.toFixed(1);
  return <span ref={ref}>{prefix}{fmt}{suffix}</span>;
}

// ── Timeline ────────────────────────────────────────────────────────
const TIMELINE = [
  { icon: IconFileText, label: 'Upload Excel', sub: 'Any format, instant' },
  { icon: IconBolt, label: 'Auto-Map & Segment', sub: '6 aging buckets' },
  { icon: IconPhone, label: 'AI Voice + WhatsApp', sub: 'Hindi · Multi-language' },
  { icon: IconCoin, label: 'Cash Recovered', sub: '₹18 Cr+ and counting' },
];

// ── MagicBento helpers (ported from React Bits, palette-adapted) ──────
const GLOW_COLOR = '156, 102, 68'; // PraecisAI rust/walnut
const SPOTLIGHT_RADIUS = 300;

// Particle card — adds stars, tilt, magnetism, ripple
function ParticleCard({
  children, className, style, particleCount = 12,
  glowColor = GLOW_COLOR, enableTilt = false, clickEffect = true, enableMagnetism = true,
}: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
  particleCount?: number; glowColor?: string;
  enableTilt?: boolean; clickEffect?: boolean; enableMagnetism?: boolean;
}) {
  const cardRef    = useRef<HTMLDivElement>(null);
  const particles  = useRef<HTMLDivElement[]>([]);
  const tids       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHovered  = useRef(false);
  const magRef     = useRef<gsap.core.Tween | null>(null);
  const memoized   = useRef<HTMLDivElement[]>([]);
  const initialized = useRef(false);

  const initParticles = useCallback(() => {
    if (initialized.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    memoized.current = Array.from({ length: particleCount }, () => {
      const el = document.createElement('div');
      el.className = 'particle';
      el.style.cssText = `position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(${glowColor},1);box-shadow:0 0 6px rgba(${glowColor},0.6);pointer-events:none;z-index:100;left:${Math.random()*width}px;top:${Math.random()*height}px;`;
      return el;
    });
    initialized.current = true;
  }, [particleCount, glowColor]);

  const clearParticles = useCallback(() => {
    tids.current.forEach(clearTimeout); tids.current = [];
    magRef.current?.kill();
    particles.current.forEach(p => gsap.to(p, { scale:0, opacity:0, duration:0.3, ease:'back.in(1.7)', onComplete: () => p.parentNode?.removeChild(p) }));
    particles.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHovered.current) return;
    if (!initialized.current) initParticles();
    memoized.current.forEach((p, i) => {
      const tid = setTimeout(() => {
        if (!isHovered.current || !cardRef.current) return;
        const clone = p.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particles.current.push(clone);
        gsap.fromTo(clone, { scale:0, opacity:0 }, { scale:1, opacity:1, duration:0.3, ease:'back.out(1.7)' });
        gsap.to(clone, { x:(Math.random()-.5)*100, y:(Math.random()-.5)*100, rotation:Math.random()*360, duration:2+Math.random()*2, ease:'none', repeat:-1, yoyo:true });
        gsap.to(clone, { opacity:0.3, duration:1.5, ease:'power2.inOut', repeat:-1, yoyo:true });
      }, i * 100);
      tids.current.push(tid);
    });
  }, [initParticles]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onEnter = () => {
      isHovered.current = true;
      animateParticles();
      if (enableTilt) gsap.to(el, { rotateX:5, rotateY:5, duration:0.3, ease:'power2.out', transformPerspective:1000 });
    };

    const onLeave = () => {
      isHovered.current = false;
      clearParticles();
      if (enableTilt) gsap.to(el, { rotateX:0, rotateY:0, duration:0.3, ease:'power2.out' });
      if (enableMagnetism) gsap.to(el, { x:0, y:0, duration:0.3, ease:'power2.out' });
    };

    const onMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const cx = r.width/2, cy = r.height/2;
      if (enableTilt) gsap.to(el, { rotateX:((y-cy)/cy)*-10, rotateY:((x-cx)/cx)*10, duration:0.1, ease:'power2.out', transformPerspective:1000 });
      if (enableMagnetism) { magRef.current = gsap.to(el, { x:(x-cx)*0.05, y:(y-cy)*0.05, duration:0.3, ease:'power2.out' }); }
    };

    const onClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const d = Math.max(Math.hypot(x,y), Math.hypot(x-r.width,y), Math.hypot(x,y-r.height), Math.hypot(x-r.width,y-r.height));
      const rip = document.createElement('div');
      rip.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;z-index:1000;width:${d*2}px;height:${d*2}px;left:${x-d}px;top:${y-d}px;background:radial-gradient(circle,rgba(${glowColor},0.4) 0%,rgba(${glowColor},0.2) 30%,transparent 70%);`;
      el.appendChild(rip);
      gsap.fromTo(rip, { scale:0, opacity:1 }, { scale:1, opacity:0, duration:0.8, ease:'power2.out', onComplete:() => rip.remove() });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('click', onClick);
    return () => {
      isHovered.current = false;
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('click', onClick);
      clearParticles();
    };
  }, [animateParticles, clearParticles, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div ref={cardRef} className={`particle-container ${className ?? ''}`} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

// Global spotlight that follows cursor across all cards
function GlobalSpotlight({ gridRef }: { gridRef: React.RefObject<HTMLDivElement | null> }) {
  const spotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    const spot = document.createElement('div');
    spot.className = 'global-spotlight';
    spot.style.cssText = `position:fixed;width:600px;height:600px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(${GLOW_COLOR},0.12) 0%,rgba(${GLOW_COLOR},0.06) 20%,rgba(${GLOW_COLOR},0.03) 35%,transparent 60%);z-index:9999;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;`;
    document.body.appendChild(spot);
    spotRef.current = spot;

    const { proximity: PROX, fadeDistance: FADE } = { proximity: SPOTLIGHT_RADIUS * 0.5, fadeDistance: SPOTLIGHT_RADIUS * 0.75 };

    const onMove = (e: MouseEvent) => {
      if (!gridRef.current || !spotRef.current) return;

      const section = gridRef.current.closest('.bento-magic-section');
      const rect = section?.getBoundingClientRect();
      const inside = rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      const cards = gridRef.current.querySelectorAll<HTMLElement>('.magic-bento-card');

      if (!inside) {
        gsap.to(spot, { opacity:0, duration:0.3 });
        cards.forEach(c => { c.style.setProperty('--glow-intensity','0'); });
        return;
      }

      let minDist = Infinity;
      cards.forEach(card => {
        const cr = card.getBoundingClientRect();
        const dist = Math.max(0, Math.hypot(e.clientX-(cr.left+cr.width/2), e.clientY-(cr.top+cr.height/2)) - Math.max(cr.width,cr.height)/2);
        minDist = Math.min(minDist, dist);
        const intensity = dist <= PROX ? 1 : dist <= FADE ? (FADE-dist)/(FADE-PROX) : 0;
        const rx = ((e.clientX-cr.left)/cr.width)*100;
        const ry = ((e.clientY-cr.top)/cr.height)*100;
        card.style.setProperty('--glow-x', `${rx}%`);
        card.style.setProperty('--glow-y', `${ry}%`);
        card.style.setProperty('--glow-intensity', intensity.toString());
        card.style.setProperty('--glow-radius', `${SPOTLIGHT_RADIUS}px`);
      });

      gsap.to(spot, { left:e.clientX, top:e.clientY, duration:0.1 });
      const tOp = minDist <= PROX ? 0.7 : minDist <= FADE ? ((FADE-minDist)/(FADE-PROX))*0.7 : 0;
      gsap.to(spot, { opacity:tOp, duration: tOp > 0 ? 0.2 : 0.5 });
    };

    const onLeave = () => {
      gridRef.current?.querySelectorAll<HTMLElement>('.magic-bento-card').forEach(c => c.style.setProperty('--glow-intensity','0'));
      if (spotRef.current) gsap.to(spotRef.current, { opacity:0, duration:0.3 });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      spotRef.current?.parentNode?.removeChild(spotRef.current);
    };
  }, [gridRef]);

  return null;
}

// BentoCard — wraps content in ParticleCard + MagicBento CSS classes
function BentoCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <ParticleCard
      className={cn(
        'magic-bento-card magic-bento-card--border-glow',
        'h-full rounded-2xl border p-5',
        'bg-[rgba(255,253,249,0.92)] dark:bg-[rgba(18,9,3,0.90)]',
        'border-[rgba(221,184,146,0.4)] dark:border-[rgba(221,184,146,0.18)]',
        'shadow-[0_4px_24px_rgba(127,85,57,0.07)] dark:shadow-[0_4px_24px_rgba(221,184,146,0.05)]',
        'backdrop-blur-[8px]',
        className,
      )}
      glowColor={GLOW_COLOR}
      particleCount={12}
      clickEffect={true}
      enableMagnetism={true}
      enableTilt={false}
    >
      {children}
    </ParticleCard>
  );
}

// ── Label pill ───────────────────────────────────────────────────────
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-body text-[10px] font-semibold uppercase tracking-[0.15em]"
      style={{ background: 'rgba(127,85,57,0.08)', color: 'var(--mahogany)', border: '1px solid rgba(127,85,57,0.14)' }}>
      {children}
    </span>
  );
}

export default function BentoSection() {
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <section className="bento-magic-section bg-[var(--cream)] px-5 py-24 sm:px-8 sm:py-32" id="features-bento">
      <GlobalSpotlight gridRef={gridRef} />
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-[var(--rust)]">
            Platform Overview
          </p>
          <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-[var(--dark-warm)]">
            <TextAnimate animation="blurInUp" by="character" once>
              Everything to recover faster
            </TextAnimate>
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-[16px] leading-relaxed text-[var(--walnut)]">
            One platform. AI voice calls, WhatsApp automation, aging analytics, and promise tracking — all synced in real time.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          ref={gridRef}
          className="bento-magic-grid grid gap-4 lg:grid-cols-3 lg:grid-rows-2"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          transition={{ staggerChildren: 0.1 }}
        >

          {/* ── 1. Large spotlight — col-span-2 row-span-2 ── */}
          <BentoCard className="lg:col-span-2 lg:row-span-2">
            <Pill><IconBolt size={11} stroke={2} />Recovery Intelligence</Pill>
            <h3 className="mb-1.5 font-display text-2xl font-bold text-[var(--dark-warm)]">
              AI that works while you sleep
            </h3>
            <p className="mb-5 font-body text-sm leading-relaxed text-[var(--walnut)]">
              PraecisAI automatically segments your debtors, places natural Hindi voice calls,
              sends WhatsApp reminders, and logs every promise — without any manual follow-up.
            </p>

            {/* Feature checklist */}
            <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { icon: IconPhone,           text: 'Natural Hindi AI voice calls' },
                { icon: IconBrandWhatsapp,   text: 'Personalised WhatsApp messages' },
                { icon: IconFileText,        text: 'Branded PDF statements auto-sent' },
                { icon: IconCalendarEvent,   text: 'Promise tracker with auto follow-up' },
                { icon: IconUsers,           text: '6-bucket aging segmentation' },
                { icon: IconTrendingUp,      text: 'Real-time recovery dashboard' },
              ].map(({ icon: Icon, text }) => (
                <div key={text}
                  className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 bg-[rgba(127,85,57,0.06)] dark:bg-[rgba(221,184,146,0.05)] border-[rgba(221,184,146,0.2)] dark:border-[rgba(221,184,146,0.12)]">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(127,85,57,0.1)] dark:bg-[rgba(221,184,146,0.08)]">
                    <Icon size={14} stroke={1.75} style={{ color: 'var(--mahogany)' }} />
                  </div>
                  <span className="font-body text-[12.5px] font-medium text-[var(--dark-warm)]">{text}</span>
                </div>
              ))}
            </div>

            {/* Mini pie + recovery highlight */}
            <div className="flex items-center gap-6 rounded-2xl border p-4 bg-[rgba(127,85,57,0.06)] dark:bg-[rgba(221,184,146,0.05)] border-[rgba(221,184,146,0.22)] dark:border-[rgba(221,184,146,0.12)]">
              <Donut pct={68} size={80} stroke={8} />
              <div>
                <p className="font-display text-3xl font-bold text-[var(--mahogany)]">₹18 Cr+</p>
                <p className="font-body text-sm text-[var(--walnut)]">recovered by our customers</p>
                <p className="mt-1 font-body text-[11px] font-semibold text-[var(--recovery-green)]">
                  ↑ 68% average recovery rate
                </p>
              </div>
            </div>
          </BentoCard>

          {/* ── 2. How it works timeline ── */}
          <BentoCard>
            <Pill><IconArrowUpRight size={11} stroke={2} />How it works</Pill>
            <h3 className="mb-4 font-display text-lg font-bold text-[var(--dark-warm)]">
              4 steps to cash
            </h3>
            <div className="relative">
              {/* Line sits behind icons (z-0) */}
              <div className="absolute left-3 top-5 bottom-5 z-0 w-px" style={{ background: 'rgba(221,184,146,0.35)' }} />
              <div className="space-y-4 pl-8">
                {TIMELINE.map(({ icon: Icon, label, sub }, i) => (
                  <motion.div key={label}
                    initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.4 }}
                    className="relative"
                  >
                    {/* Icon circle: z-10 + opaque bg so it masks the line */}
                    <div className="absolute -left-8 top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border
                      bg-[var(--cream)] dark:bg-[rgba(18,9,3,1)]
                      border-[rgba(221,184,146,0.4)] dark:border-[rgba(221,184,146,0.22)]">
                      <Icon size={12} stroke={1.75} style={{ color: 'var(--mahogany)' }} />
                    </div>
                    <p className="font-body text-[13px] font-semibold text-[var(--dark-warm)]">{label}</p>
                    <p className="font-body text-[11px] text-[var(--walnut)]">{sub}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </BentoCard>

          {/* ── 3. Performance metrics ── */}
          <BentoCard>
            <Pill><IconChartBar size={11} stroke={2} />Performance</Pill>
            <h3 className="mb-4 font-display text-lg font-bold text-[var(--dark-warm)]">
              AI-driven results
            </h3>
            <div className="space-y-4">
              {[
                { icon: IconPhone,   label: 'Call connect rate', value: 78, color: 'var(--mahogany)' },
                { icon: IconTarget,  label: 'Promise rate',       value: 62, color: 'var(--rust)'     },
                { icon: IconCoin,    label: 'Collection rate',    value: 68, color: 'var(--recovery-green)' },
                { icon: IconClock,   label: 'Time saved',         value: 85, color: 'var(--walnut)'   },
              ].map(({ icon: Icon, label, value, color }, i) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon size={13} stroke={1.75} style={{ color }} />
                      <span className="font-body text-[12px] font-medium text-[var(--dark-warm)]">{label}</span>
                    </div>
                    <span className="font-display text-[12px] font-bold" style={{ color }}>
                      <Counter end={value} suffix="%" />
                    </span>
                  </div>
                  <Bar value={value} color={color} delay={i * 0.1} />
                </div>
              ))}
            </div>
          </BentoCard>

        </motion.div>
      </div>
    </section>
  );
}
