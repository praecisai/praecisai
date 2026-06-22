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
  { id: 'node-1', icon: IconFileSpreadsheet, label: 'Upload Excel', x: 200, y: 250 },
  { id: 'node-2', icon: IconWand, label: 'Auto-Map Columns', x: 440, y: 150 },
  { id: 'node-3', icon: IconUsers, label: 'AI Segments Parties', x: 680, y: 350 },
  { id: 'node-4', icon: IconBrandWhatsapp, label: 'WhatsApp + Voice Sent', x: 920, y: 150 },
  { id: 'node-5', icon: IconCalendarEvent, label: 'Promises Tracked', x: 1160, y: 350 },
  { id: 'node-6', icon: IconCoin, label: 'Cash Recovered', x: 1400, y: 250, isClimax: true },
];

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

export default function WorkflowSplash({ onComplete }: WorkflowSplashProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLogo, setShowLogo] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setSkipAnimation(true);
      setShowLogo(true);
    }
  }, []);

  const handleSequenceComplete = () => {
    setShowLogo(true);
    setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 500);
    }, 2500);
  };

  const handleSkip = () => {
    setSkipAnimation(true);
    setShowLogo(true);
    setIsExiting(true);
    setTimeout(onComplete, 500);
  };

  useWorkflowTimeline(containerRef, handleSequenceComplete);

  // Trigger logo reveal exactly at 6.4s (handled by setting state, but GSAP takes precedence)
  useEffect(() => {
    if (skipAnimation) return;
    const timer = setTimeout(() => setShowLogo(true), 6400);
    return () => clearTimeout(timer);
  }, [skipAnimation]);

  const paths = generatePaths(NODES);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0F0A06]"
      initial={{ opacity: 1, y: 0 }}
      animate={isExiting ? { opacity: 0, y: -30 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeIn' }}
      ref={containerRef}
    >
      {/* Background drifting grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--caramel) 1px, transparent 1px), linear-gradient(90deg, var(--caramel) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          animation: 'drift 20s linear infinite',
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drift {
          0% { background-position: 0px 0px; }
          100% { background-position: 40px 40px; }
        }
      `}} />

      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_20%,rgba(15,10,6,0.8)_100%)] z-10" />

      {/* Main Canvas Container (Aspect Ratio 1600x500) */}
      {!skipAnimation && (
        <div className="canvas-layer relative w-full max-w-[1600px] h-[400px] sm:h-[500px] z-20 flex items-center justify-center">
          <div className="relative w-[1600px] h-[500px] scale-[0.25] sm:scale-50 md:scale-75 lg:scale-100 origin-center transition-transform duration-300">
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
              />
            ))}

            {/* Radial flash overlay for explosion */}
            <div
              id="flash-overlay"
              className="absolute left-[800px] top-[250px] w-[800px] h-[800px] rounded-full bg-white blur-[60px] pointer-events-none origin-center opacity-0 z-40"
              style={{ transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>
      )}

      {/* Logo Reveal */}
      <AnimatePresence>
        {showLogo && <LogoReveal />}
      </AnimatePresence>

      {/* Skip Button */}
      <motion.button
        className="absolute bottom-6 right-6 z-50 text-[12px] font-medium text-[var(--walnut)] opacity-0 hover:text-[var(--cream)] transition-colors duration-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1, duration: 0.5 }}
        onClick={handleSkip}
      >
        Skip animation
      </motion.button>
    </motion.div>
  );
}
