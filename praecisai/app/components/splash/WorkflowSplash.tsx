'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkflowTimeline } from './useWorkflowTimeline';
import WorkflowNode from './WorkflowNode';
import WorkflowPath from './WorkflowPath';
import LogoReveal from './LogoReveal';
import {
  IconFileSpreadsheet,
  IconWand,
  IconUsers,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconCoin,
} from '@tabler/icons-react';

interface WorkflowSplashProps {
  onComplete: () => void;
}

const NODES = [
  { id: 'node-1', icon: IconFileSpreadsheet, label: 'Upload Excel', x: 200, y: 250, metric: 'Instant' },
  { id: 'node-2', icon: IconWand, label: 'Auto-Map Columns', x: 440, y: 150, metric: '100% Auto' },
  { id: 'node-3', icon: IconUsers, label: 'AI Segments Parties', x: 680, y: 350, metric: '6 Segments' },
  { id: 'node-4', icon: IconBrandWhatsapp, label: 'WhatsApp + Voice', x: 920, y: 150, metric: 'Multi-Channel' },
  { id: 'node-5', icon: IconCalendarEvent, label: 'Promises Tracked', x: 1160, y: 350, metric: 'Real-Time' },
  { id: 'node-6', icon: IconCoin, label: 'Cash Recovered', x: 1400, y: 250, isClimax: true, metric: '₹18 Cr+' },
] as const;

function generatePaths(nodes: typeof NODES) {
  const paths = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const start = nodes[i];
    const end = nodes[i + 1];
    const dx = (end.x - start.x) / 2;
    paths.push({
      id: `path-${i + 1}`,
      d: `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`,
    });
  }
  return paths;
}

// Pre-computed particles to avoid hydration mismatch
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
  { x: 40, y: 12, s: 1.8, d: 10.2, delay: -4.2 },
  { x: 72, y: 78, s: 1.5, d: 8.8, delay: -2.5 },
  { x: 28, y: 46, s: 1.2, d: 7.3, delay: -6.7 },
  { x: 50, y: 5,  s: 1.7, d: 11.1, delay: -1.6 },
  { x: 8,  y: 62, s: 2.0, d: 9.0, delay: -9.2 },
  { x: 93, y: 28, s: 1.1, d: 7.6, delay: -3.1 },
  { x: 38, y: 82, s: 1.9, d: 10.6, delay: -5.9 },
  { x: 64, y: 48, s: 1.4, d: 8.4, delay: -0.3 },
  { x: 18, y: 7,  s: 1.6, d: 9.9, delay: -4.6 },
];

export default function WorkflowSplash({ onComplete }: WorkflowSplashProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLogo, setShowLogo] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setSkipAnimation(true);
      setShowLogo(true);
    }
  }, []);

  const handleSequenceComplete = () => {
    setShowLogo(true);
    setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 600);
    }, 3000);
  };

  const handleSkip = () => {
    setSkipAnimation(true);
    setShowLogo(true);
    setIsExiting(true);
    setTimeout(onComplete, 500);
  };

  useWorkflowTimeline(containerRef, handleSequenceComplete);

  useEffect(() => {
    if (skipAnimation) return;
    const timer = setTimeout(() => setShowLogo(true), 6800);
    return () => clearTimeout(timer);
  }, [skipAnimation]);

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
          100% { background-position: 40px 40px; }
        }
        @keyframes orb-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(40px,-30px) scale(1.12); }
          75%     { transform: translate(-25px,15px) scale(0.93); }
        }
        @keyframes orb-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          35%     { transform: translate(-50px,20px) scale(1.08); }
          70%     { transform: translate(30px,-40px) scale(0.96); }
        }
        @keyframes orb-3 {
          0%,100% { transform: translate(-50%,-50%) scale(1); }
          50%     { transform: translate(-50%,-50%) scale(1.15); }
        }
        @keyframes pdrift {
          0%,100% { transform: translate(0,0) scale(1); opacity: var(--po); }
          33%     { transform: translate(8px,-12px) scale(1.2); opacity: calc(var(--po) * 1.5); }
          66%     { transform: translate(-6px,8px) scale(0.8); opacity: calc(var(--po) * 0.6); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}} />

      {/* ── Drifting grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(221,184,146,1) 1px, transparent 1px), linear-gradient(90deg, rgba(221,184,146,1) 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
          opacity: 0.025,
          animation: 'drift 22s linear infinite',
        }}
      />

      {/* ── Ambient glow orbs ── */}
      <div
        className="absolute top-[15%] left-[8%] w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(156,102,68,0.22) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'orb-1 14s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[10%] right-[6%] w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(221,184,146,0.14) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'orb-2 18s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          width: '700px',
          height: '320px',
          background: 'radial-gradient(ellipse, rgba(156,102,68,0.1) 0%, transparent 65%)',
          filter: 'blur(80px)',
          animation: 'orb-3 24s ease-in-out infinite',
        }}
      />

      {/* ── Floating particles ── */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
            background: '#DDB892',
            '--po': '0.25',
            opacity: 0.22,
            animation: `pdrift ${p.d}s ease-in-out ${p.delay}s infinite`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Slow scanline ── */}
      <div
        className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(221,184,146,0.07) 50%, transparent 100%)',
          animation: 'scanline 12s linear infinite',
        }}
      />

      {/* ── Radial vignette ── */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(10,6,3,0.75)_100%)]" />

      {/* ── Workflow canvas ── */}
      {!skipAnimation && (
        <div className="canvas-layer relative w-full max-w-[1600px] h-[400px] sm:h-[500px] z-20 flex items-center justify-center">
          <div className="relative w-[1600px] h-[500px] scale-[0.24] sm:scale-[0.48] md:scale-[0.72] lg:scale-100 origin-center">

            <WorkflowPath paths={paths} />

            {NODES.map((n) => (
              <WorkflowNode
                key={n.id}
                id={n.id}
                icon={n.icon}
                label={n.label}
                left={`${n.x}px`}
                top={`${n.y}px`}
                isClimax={'isClimax' in n ? n.isClimax : undefined}
                metric={n.metric}
              />
            ))}

            {/* Central radial flash */}
            <div
              id="flash-overlay"
              className="absolute rounded-full pointer-events-none origin-center opacity-0 z-40"
              style={{
                left: '800px',
                top: '250px',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(255,248,235,1) 0%, rgba(221,184,146,0.6) 40%, transparent 70%)',
                filter: 'blur(40px)',
                transform: 'translate(-50%,-50%)',
              }}
            />

            {/* Shockwave rings from node-6 */}
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                id={`shockwave-${n}`}
                className="absolute rounded-full pointer-events-none origin-center opacity-0 z-30"
                style={{
                  left: '1400px',
                  top: '250px',
                  width: '80px',
                  height: '80px',
                  transform: 'translate(-50%,-50%)',
                  border: `${4 - n}px solid rgba(221,184,146,${0.8 - n * 0.15})`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Logo Reveal ── */}
      <AnimatePresence>
        {showLogo && <LogoReveal />}
      </AnimatePresence>

      {/* ── Skip ── */}
      <motion.button
        className="absolute bottom-6 right-6 z-50 text-[11px] font-medium text-[var(--walnut)] hover:text-[var(--cream)] transition-colors duration-200 tracking-wider uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        onClick={handleSkip}
      >
        Skip
      </motion.button>
    </motion.div>
  );
}
