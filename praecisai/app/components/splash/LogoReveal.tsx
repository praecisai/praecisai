'use client';

import React from 'react';
import { motion } from 'framer-motion';

const LETTERS = ['P', 'R', 'A', 'E', 'C', 'I', 'S'];

const BARS = [
  { label: 'Mar', pct: 42 },
  { label: 'Apr', pct: 58 },
  { label: 'May', pct: 71 },
  { label: 'Jun', pct: 83 },
  { label: 'Jul', pct: 93 },
  { label: 'Aug', pct: 100 },
];
const BAR_H = 46; // max bar height px
const BAR_COLORS = [
  'rgba(176,137,104,0.55)',
  'rgba(176,137,104,0.68)',
  'rgba(156,102,68,0.75)',
  'rgba(221,184,146,0.72)',
  'rgba(156,102,68,0.88)',
  '#DDB892',
];

const RING_R = 28;
const RING_C = 2 * Math.PI * RING_R; // ≈ 175.9

const FEED = [
  { name: 'Mehta Industries', amt: '₹4.2L', dot: '#4A7C59' },
  { name: 'R. Sharma & Co.', amt: '₹1.8L', dot: '#DDB892' },
  { name: 'Kapoor Traders', amt: '₹6.4L', dot: '#9C2020' },
];

export default function LogoReveal() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none select-none px-4">

      {/* Top decorative line */}
      <motion.div
        className="mb-5 h-px w-[220px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(156,102,68,0.75), transparent)', transformOrigin: 'center' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.65, ease: 'easeOut' }}
      />

      {/* Logo — letter-by-letter + AI blur-dissolve */}
      <div className="relative flex items-baseline">
        <div className="flex overflow-hidden">
          {LETTERS.map((letter, i) => (
            <motion.span
              key={i}
              className="font-display font-bold tracking-[-0.04em] text-[#FDF8F3] inline-block"
              style={{ fontSize: 'clamp(38px, 8.5vw, 70px)' }}
              initial={{ opacity: 0, y: 52, rotateX: -55 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.65, delay: 0.06 + i * 0.07, ease: [0.175, 0.885, 0.32, 1.15] }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
        <motion.span
          className="font-display font-bold tracking-[-0.04em] inline-block"
          style={{ fontSize: 'clamp(38px, 8.5vw, 70px)', color: 'var(--rust)', textShadow: '0 0 48px rgba(156,102,68,1), 0 0 100px rgba(156,102,68,0.5)' }}
          initial={{ opacity: 0, scale: 1.6, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.88, delay: 0.58, ease: [0.175, 0.885, 0.32, 1.1] }}
        >
          AI
        </motion.span>
        {/* Sheen sweep */}
        <motion.div
          className="absolute inset-y-0 w-[90px] pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)', filter: 'blur(5px)', top: '10%', height: '80%' }}
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 520, opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.52, duration: 0.88, ease: 'easeInOut', times: [0, 0.08, 0.92, 1] }}
        />
      </div>

      {/* Bottom decorative line */}
      <motion.div
        className="mt-5 mb-7 h-px w-[220px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(156,102,68,0.75), transparent)', transformOrigin: 'center' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.65, ease: 'easeOut' }}
      />

      {/* ── Tagline — mask-slide reveal ── */}
      <div className="flex flex-col items-center gap-[6px]">
        {[
          { plain: 'RECOVER', accent: 'FASTER.', d: 1.1 },
          { plain: 'CHASE',   accent: 'SMARTER.', d: 1.3 },
        ].map(({ plain, accent, d }) => (
          <div key={plain} className="flex items-baseline gap-3 sm:gap-4">
            {/* Plain word slides up through a mask */}
            <div style={{ overflow: 'hidden' }}>
              <motion.span
                className="font-display font-bold block"
                style={{ fontSize: 'clamp(13px, 2.8vw, 22px)', letterSpacing: '0.18em', color: 'rgba(253,248,243,0.78)' }}
                initial={{ y: '115%' }}
                animate={{ y: '0%' }}
                transition={{ delay: d, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {plain}
              </motion.span>
            </div>

            {/* Accent word slides up with glow, underline draws after */}
            <div className="relative" style={{ overflow: 'visible' }}>
              <div style={{ overflow: 'hidden' }}>
                <motion.span
                  className="font-display font-bold block"
                  style={{ fontSize: 'clamp(13px, 2.8vw, 22px)', letterSpacing: '0.18em', color: 'var(--rust)', textShadow: '0 0 20px rgba(156,102,68,0.9)' }}
                  initial={{ y: '115%' }}
                  animate={{ y: '0%' }}
                  transition={{ delay: d + 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  {accent}
                </motion.span>
              </div>
              {/* Animated underline */}
              <motion.div
                className="absolute left-0 right-0 h-px"
                style={{ bottom: '-5px', background: 'linear-gradient(90deg, rgba(156,102,68,1), rgba(221,184,146,0.45))', transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: d + 0.42, duration: 0.42, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Analysis Dashboard Card ── */}
      <motion.div
        className="mt-8 w-full max-w-[600px] rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(6,4,2,0.92)',
          border: '1px solid rgba(221,184,146,0.15)',
          backdropFilter: 'blur(28px)',
          boxShadow: '0 0 80px rgba(156,102,68,0.09), 0 28px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(221,184,146,0.1)',
        }}
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.58, duration: 0.72, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-5 pt-[10px] pb-[9px]"
          style={{ borderBottom: '1px solid rgba(221,184,146,0.09)' }}
        >
          <span className="font-body text-[9.5px] uppercase tracking-[0.22em]" style={{ color: 'rgba(176,137,104,0.65)' }}>
            Recovery Intelligence
          </span>
          <div className="flex items-center gap-2">
            <motion.span
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: '#4A7C59', boxShadow: '0 0 8px #4A7C59' }}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="font-body text-[8.5px] uppercase tracking-wider" style={{ color: 'rgba(176,137,104,0.55)' }}>
              AI Active
            </span>
          </div>
        </div>

        {/* 3-column body */}
        <div className="grid grid-cols-3">

          {/* ─ Bar chart ─ */}
          <div
            className="flex flex-col gap-2.5 px-5 py-3.5"
            style={{ borderRight: '1px solid rgba(221,184,146,0.09)' }}
          >
            <span className="font-body text-[8px] uppercase tracking-[0.18em]" style={{ color: 'rgba(176,137,104,0.45)' }}>
              Monthly Trend
            </span>
            <div className="flex items-end gap-[5px]">
              {BARS.map((bar, i) => (
                <div key={bar.label} className="flex-1 flex flex-col items-center gap-[4px]">
                  {/* Bar container — fixed height, flex-end aligns bar to bottom */}
                  <div style={{ height: `${BAR_H}px`, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <motion.div
                      style={{
                        height: `${(bar.pct / 100) * BAR_H}px`,
                        width: '100%',
                        background: BAR_COLORS[i],
                        borderRadius: '2px',
                        transformOrigin: 'bottom',
                        boxShadow: i === 5 ? `0 0 10px ${BAR_COLORS[i]}` : 'none',
                      }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 1.84 + i * 0.07, duration: 0.5, ease: 'backOut' }}
                    />
                  </div>
                  <motion.span
                    className="font-body"
                    style={{ fontSize: '6.5px', color: 'rgba(176,137,104,0.45)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.15 + i * 0.04 }}
                  >
                    {bar.label}
                  </motion.span>
                </div>
              ))}
            </div>
          </div>

          {/* ─ Donut ring ─ */}
          <div
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-3"
            style={{ borderRight: '1px solid rgba(221,184,146,0.09)' }}
          >
            <span className="font-body text-[8px] uppercase tracking-[0.18em]" style={{ color: 'rgba(176,137,104,0.45)' }}>
              Recovery Rate
            </span>
            <div className="relative flex items-center justify-center" style={{ width: 76, height: 76 }}>
              <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="ring-lg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DDB892" />
                    <stop offset="100%" stopColor="#9C6644" />
                  </linearGradient>
                </defs>
                {/* Track */}
                <circle cx="38" cy="38" r={RING_R} fill="none" stroke="rgba(221,184,146,0.1)" strokeWidth="5" />
                {/* Animated fill */}
                <motion.circle
                  cx="38" cy="38" r={RING_R}
                  fill="none"
                  stroke="url(#ring-lg)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  initial={{ strokeDashoffset: RING_C }}
                  animate={{ strokeDashoffset: RING_C * 0.06 }}
                  transition={{ delay: 1.98, duration: 1.35, ease: 'easeInOut' }}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(156,102,68,0.85))' }}
                />
              </svg>
              {/* Center label */}
              <motion.div
                className="absolute flex flex-col items-center leading-none"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.55, duration: 0.45, ease: 'backOut' }}
              >
                <span className="font-display font-bold" style={{ fontSize: '21px', color: '#DDB892', textShadow: '0 0 18px rgba(221,184,146,0.6)' }}>
                  94%
                </span>
                <span className="font-body" style={{ fontSize: '7px', color: 'rgba(176,137,104,0.45)', letterSpacing: '0.12em' }}>
                  RATE
                </span>
              </motion.div>
            </div>
          </div>

          {/* ─ Live feed ─ */}
          <div className="flex flex-col gap-2 px-5 py-3.5">
            <span className="font-body text-[8px] uppercase tracking-[0.18em]" style={{ color: 'rgba(176,137,104,0.45)' }}>
              Live Feed
            </span>
            {FEED.map((row, i) => (
              <motion.div
                key={row.name}
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.08 + i * 0.2, duration: 0.42, ease: 'easeOut' }}
              >
                <div className="flex items-center gap-1.5 min-w-0 mr-2">
                  <motion.span
                    className="h-[5px] w-[5px] flex-shrink-0 rounded-full"
                    style={{ background: row.dot, boxShadow: `0 0 6px ${row.dot}` }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
                  />
                  <span className="font-body truncate" style={{ fontSize: '9px', color: 'rgba(176,137,104,0.68)' }}>
                    {row.name}
                  </span>
                </div>
                <span className="font-display font-bold flex-shrink-0" style={{ fontSize: '9px', color: '#DDB892' }}>
                  {row.amt}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Card footer */}
        <div
          className="flex items-center justify-between px-5 py-2"
          style={{ borderTop: '1px solid rgba(221,184,146,0.07)' }}
        >
          {/* Animated segment indicator bars */}
          <div className="flex items-center gap-[3px]">
            {[6, 10, 16, 10, 6].map((w, i) => (
              <motion.div
                key={i}
                className="h-px rounded-full"
                style={{ width: `${w}px`, background: `rgba(156,102,68,${0.25 + i * 0.1 - (i > 2 ? (i - 2) * 0.18 : 0)})` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 2.72 + i * 0.06, duration: 0.3 }}
              />
            ))}
          </div>
          <motion.span
            className="font-body"
            style={{ fontSize: '7.5px', color: 'rgba(176,137,104,0.35)', letterSpacing: '0.1em' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.85 }}
          >
            PRAECISAI ENGINE v2
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}
