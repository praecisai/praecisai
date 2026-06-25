'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkflowTimeline } from './useWorkflowTimeline';
import WorkflowNode from './WorkflowNode';
import WorkflowPath from './WorkflowPath';
import LogoReveal from './LogoReveal';
import {
  IconFileSpreadsheet,
  IconWand,
  IconPhone,
  IconBrandWhatsapp,
  IconCoin,
  IconChartBar,
} from '@tabler/icons-react';

interface WorkflowSplashProps {
  onComplete: () => void;
}

// 260px spacing, 1500px canvas, all y=165, nodes 180px wide
export const NODES: Array<{
  id: string;
  icon: React.ElementType;
  label: string;
  x: number;
  y: number;
  metric: string;
  step: string;
  isClimax?: boolean;
}> = [
  { id: 'node-1', icon: IconFileSpreadsheet, label: 'Upload Excel',      x: 90,   y: 165, metric: 'Instant',       step: '01' },
  { id: 'node-2', icon: IconWand,            label: 'Auto-Map Columns',  x: 350,  y: 165, metric: '100% Auto',     step: '02' },
  { id: 'node-3', icon: IconPhone,           label: 'AI Voice Calling',  x: 610,  y: 165, metric: 'Multi Language', step: '03' },
  { id: 'node-4', icon: IconBrandWhatsapp,   label: 'WhatsApp + PDF',    x: 870,  y: 165, metric: 'Multi-Channel', step: '04' },
  { id: 'node-5', icon: IconChartBar,        label: 'Smart Reports',     x: 1130, y: 165, metric: '6 Segments',    step: '05' },
  { id: 'node-6', icon: IconCoin,            label: 'Cash Recovered',    x: 1390, y: 165, metric: '₹18 Cr+',      step: '06', isClimax: true },
];

const NODE_HALF_W = 90; // half of 180px node width

// Paths go EDGE-to-EDGE (not center-to-center) so the line doesn't pass through node cards
function generatePaths(nodes: typeof NODES) {
  return nodes.slice(0, -1).map((start, i) => {
    const end = nodes[i + 1];
    return {
      id: `path-${i + 1}`,
      d: `M ${start.x + NODE_HALF_W} ${start.y} L ${end.x - NODE_HALF_W} ${end.y}`,
      // Full center-to-center path for GSAP MotionPath (invisible, comet snaps under node cards)
      motionD: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    };
  });
}

const PARTICLES = [
  { x: 12, y: 18, s: 1.8, d: 8.2, delay: -2.1 },
  { x: 88, y: 72, s: 1.2, d: 10.5, delay: -5.4 },
  { x: 34, y: 55, s: 2.0, d: 7.8, delay: -1.3 },
  { x: 67, y: 22, s: 1.5, d: 9.1, delay: -7.2 },
  { x: 91, y: 44, s: 1.0, d: 11.3, delay: -3.8 },
  { x: 5,  y: 80, s: 1.7, d: 6.9, delay: -0.5 },
  { x: 55, y: 90, s: 1.3, d: 8.6, delay: -4.9 },
  { x: 78, y: 10, s: 2.2, d: 7.2, delay: -6.1 },
  { x: 22, y: 38, s: 1.1, d: 10.8, delay: -2.7 },
  { x: 45, y: 65, s: 1.9, d: 9.4, delay: -8.3 },
  { x: 3,  y: 50, s: 1.4, d: 7.5, delay: -1.9 },
  { x: 96, y: 86, s: 1.6, d: 11.9, delay: -5.6 },
  { x: 60, y: 30, s: 1.0, d: 8.0, delay: -3.4 },
  { x: 15, y: 94, s: 2.1, d: 9.7, delay: -7.8 },
  { x: 82, y: 58, s: 1.3, d: 6.5, delay: -0.8 },
];

export default function WorkflowSplash({ onComplete }: WorkflowSplashProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLogo, setShowLogo] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSkipAnimation(true);
      setShowLogo(true);
    }
  }, []);

  const handleSequenceComplete = () => {
    setShowLogo(true);
    setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 600);
    }, 3200);
  };

  const handleSkip = () => {
    setSkipAnimation(true);
    setShowLogo(true);
    setIsExiting(true);
    setTimeout(onComplete, 500);
  };

  // Desktop: GSAP drives the sequence
  useWorkflowTimeline(containerRef, handleSequenceComplete, !isMobile && !skipAnimation);

  // Mobile: independent timer — nodes stagger in over ~3s, logo shows at 5s
  useEffect(() => {
    if (!isMobile || skipAnimation) return;
    const timer = setTimeout(handleSequenceComplete, 4000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, skipAnimation]);

  const paths = generatePaths(NODES);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0A0603]"
      initial={{ opacity: 1 }}
      animate={isExiting ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeIn' }}
      ref={containerRef}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drift {
          0%   { background-position: 0px 0px; }
          100% { background-position: 60px 60px; }
        }
        @keyframes orb-float {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(30px,-25px) scale(1.1); }
          70%     { transform: translate(-20px,15px) scale(0.94); }
        }
        @keyframes orb-float-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          35%     { transform: translate(-45px,18px) scale(1.07); }
          70%     { transform: translate(25px,-35px) scale(0.97); }
        }
        @keyframes pdrift {
          0%,100% { transform: translate(0,0) scale(1); opacity: var(--po); }
          33%     { transform: translate(6px,-10px) scale(1.3); opacity: calc(var(--po) * 1.6); }
          66%     { transform: translate(-5px,7px) scale(0.75); opacity: calc(var(--po) * 0.5); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes node-activate-ring {
          0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 0.9; }
          60%  { transform: translate(-50%,-50%) scale(1.6); opacity: 0.4; }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }
        @keyframes mobile-glow-pulse {
          0%,100% { box-shadow: 0 0 0px rgba(156,102,68,0); }
          50%     { box-shadow: 0 0 20px rgba(156,102,68,0.5), 0 0 40px rgba(156,102,68,0.2); }
        }
      `}} />

      {/* Drifting grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(221,184,146,1) 1px, transparent 1px), linear-gradient(90deg, rgba(221,184,146,1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px', opacity: 0.016, animation: 'drift 30s linear infinite',
      }} />

      {/* Ambient orbs */}
      <div className="absolute top-[8%] left-[4%] w-[700px] h-[700px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(156,102,68,0.16) 0%, transparent 70%)',
        filter: 'blur(90px)', animation: 'orb-float 18s ease-in-out infinite',
      }} />
      <div className="absolute bottom-[6%] right-[3%] w-[580px] h-[580px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(221,184,146,0.1) 0%, transparent 70%)',
        filter: 'blur(80px)', animation: 'orb-float-2 22s ease-in-out infinite',
      }} />
      <div className="absolute rounded-full pointer-events-none" style={{
        left: '50%', top: '50%', width: '1000px', height: '260px',
        background: 'radial-gradient(ellipse, rgba(156,102,68,0.07) 0%, transparent 65%)',
        filter: 'blur(100px)', transform: 'translate(-50%,-50%)',
      }} />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none" style={{
          left: `${p.x}%`, top: `${p.y}%`, width: `${p.s}px`, height: `${p.s}px`,
          background: '#DDB892', '--po': '0.18', opacity: 0.15,
          animation: `pdrift ${p.d}s ease-in-out ${p.delay}s infinite`,
        } as React.CSSProperties} />
      ))}

      {/* Scanline */}
      <div className="absolute left-0 right-0 h-px pointer-events-none z-10" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(221,184,146,0.05) 50%, transparent 100%)',
        animation: 'scanline 16s linear infinite',
      }} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(10,6,3,0.88)_100%)]" />

      {/* ── Desktop: GSAP horizontal canvas ── */}
      {!skipAnimation && (
        <div
          className="canvas-layer hidden sm:flex relative w-full px-4 z-20 items-center justify-center"
          style={{ height: 'clamp(200px, 28vw, 360px)' }}
        >
          <div
            className="relative origin-center"
            style={{
              width: '1500px',
              height: '340px',
              transform: `scale(clamp(0.20, calc((min(100vw, 1500px) - 32px) / 1500px), 1))`,
            }}
          >
            <WorkflowPath paths={paths} />

            {NODES.map((n) => (
              <WorkflowNode
                key={n.id}
                id={n.id}
                icon={n.icon}
                label={n.label}
                left={`${n.x}px`}
                top={`${n.y}px`}
                isClimax={n.isClimax}
                metric={n.metric}
                step={n.step}
              />
            ))}

            {/* Flash overlay at canvas center */}
            <div id="flash-overlay" className="absolute rounded-full pointer-events-none origin-center opacity-0 z-40" style={{
              left: '740px', top: '165px', width: '480px', height: '480px',
              background: 'radial-gradient(circle, rgba(255,248,235,1) 0%, rgba(221,184,146,0.55) 40%, transparent 70%)',
              filter: 'blur(48px)', transform: 'translate(-50%,-50%)',
            }} />

            {/* Shockwave rings at climax node */}
            {[1, 2, 3].map((n) => (
              <div key={n} id={`shockwave-${n}`} className="absolute rounded-full pointer-events-none origin-center opacity-0 z-30" style={{
                left: '1390px', top: '165px', width: '90px', height: '90px',
                transform: 'translate(-50%,-50%)',
                border: `${4 - n}px solid rgba(221,184,146,${0.8 - n * 0.15})`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile: sequential nodes + blast ── */}
      <AnimatePresence>
        {!skipAnimation && isMobile && !showLogo && (
          // Outer container fills the whole screen so blast elements
          // can be positioned relative to the viewport center
          <motion.div
            className="sm:hidden absolute inset-0 z-20"
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
          >
            {/* Node column — centred vertically */}
            <div
              className="absolute inset-x-0 flex flex-col items-center px-5"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              {NODES.map((node, i) => {
                const Icon = node.icon;
                const isLast = i === NODES.length - 1;
                return (
                  <div key={node.id} className="flex flex-col items-center w-full max-w-[280px]">
                    <motion.div
                      className="relative w-full"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.48 + 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div
                        className="relative w-full rounded-xl flex items-center gap-3 px-4 py-3 overflow-hidden"
                        style={{
                          background: node.isClimax ? 'rgba(30,16,6,0.96)' : 'rgba(10,6,3,0.94)',
                          border: `1px solid rgba(221,184,146,${node.isClimax ? 0.5 : 0.16})`,
                          backdropFilter: 'blur(20px)',
                          animation: node.isClimax ? `mobile-glow-pulse 2.5s ease-in-out ${i * 0.48 + 0.9}s infinite` : 'none',
                        }}
                      >
                        {node.isClimax && (
                          <motion.div
                            className="absolute top-0 left-0 right-0 h-px"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(221,184,146,0.9), transparent)' }}
                            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                            transition={{ delay: i * 0.48 + 0.5, duration: 0.5 }}
                          />
                        )}
                        <span className="absolute top-1 left-2 text-[8px] font-mono font-bold tracking-widest"
                          style={{ color: 'rgba(221,184,146,0.3)' }}>{node.step}</span>
                        <motion.div
                          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(156,102,68,0.12)', border: '1px solid rgba(221,184,146,0.18)' }}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.48 + 0.35, duration: 0.35, ease: 'backOut' }}
                        >
                          <Icon size={16} stroke={1.75} style={{ color: node.isClimax ? '#DDB892' : '#9C6644' }} />
                        </motion.div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[11px] font-semibold tracking-wide truncate"
                            style={{ color: 'rgba(221,184,146,0.78)' }}>{node.label}</span>
                          <motion.span
                            className="text-[10px] font-bold tracking-wider"
                            style={{ color: node.isClimax ? '#EDE0D4' : 'rgba(156,102,68,0.85)',
                              textShadow: node.isClimax ? '0 0 14px rgba(221,184,146,0.7)' : 'none' }}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.48 + 0.55, duration: 0.3 }}
                          >{node.metric}</motion.span>
                        </div>
                        <motion.div
                          className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                          style={{ background: node.isClimax ? '#DDB892' : '#9C6644',
                            boxShadow: `0 0 8px ${node.isClimax ? '#DDB892' : '#9C6644'}` }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.48 + 0.6, duration: 0.25, ease: 'backOut' }}
                        />
                      </div>
                    </motion.div>

                    {!isLast && (
                      <div className="relative flex flex-col items-center" style={{ height: '18px' }}>
                        <motion.div
                          className="w-px"
                          style={{ height: '18px', background: 'linear-gradient(to bottom, rgba(156,102,68,0.7), rgba(156,102,68,0.15))', transformOrigin: 'top' }}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: i * 0.48 + 0.55, duration: 0.25 }}
                        />
                        <motion.div
                          className="absolute w-1 h-1 rounded-full"
                          style={{ background: '#9C6644', boxShadow: '0 0 6px rgba(156,102,68,0.8)', top: '50%', transform: 'translateY(-50%)' }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                          transition={{ delay: i * 0.48 + 0.6, duration: 0.4 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Blast effects — positioned relative to screen center ── */}
            {/* last node appears at ~3.05s; blast fires at 3.1s            */}

            {/* All-node blink: full-screen amber overlay flickers */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'rgba(221,184,146,0.08)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.55, 0.22, 0.65, 0.18, 0.5, 0] }}
              transition={{ delay: 3.0, duration: 0.9, times: [0, 0.12, 0.28, 0.42, 0.57, 0.72, 1], ease: 'linear' }}
            />

            {/* Screen flash */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, rgba(255,248,235,0.75) 0%, rgba(221,184,146,0.4) 35%, transparent 70%)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0] }}
              transition={{ delay: 3.1, duration: 1.05, times: [0, 0.16, 1] }}
            />

            {/* 3 shockwave rings expanding from screen center */}
            {[0, 1, 2].map((n) => (
              <motion.div
                key={`ring-${n}`}
                className="absolute pointer-events-none rounded-full"
                style={{
                  border: `${3 - n}px solid rgba(221,184,146,${0.8 - n * 0.22})`,
                  top: '50%',
                  left: '50%',
                  // start size: tiny (hidden), end size: fills screen
                }}
                initial={{ width: 40, height: 40, x: '-50%', y: '-50%', opacity: 0 }}
                animate={{
                  width:  [40, 40 + (n + 1) * 230],
                  height: [40, 40 + (n + 1) * 230],
                  x: '-50%',
                  y: '-50%',
                  opacity: [0, 0.85, 0],
                }}
                transition={{
                  delay: 3.1 + n * 0.15,
                  duration: 1.25,
                  ease: [0.16, 1, 0.3, 1],
                  times: [0, 0.12, 1],
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logo Reveal */}
      <AnimatePresence>
        {showLogo && <LogoReveal />}
      </AnimatePresence>

      {/* Skip */}
      <motion.button
        className="absolute bottom-5 right-5 z-50 text-[10px] font-medium tracking-widest uppercase transition-colors duration-200"
        style={{ color: 'rgba(176,137,104,0.5)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        whileHover={{ color: 'rgba(221,184,146,0.85)' }}
        onClick={handleSkip}
      >
        Skip →
      </motion.button>
    </motion.div>
  );
}
