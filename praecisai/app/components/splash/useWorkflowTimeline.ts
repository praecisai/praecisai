import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { RefObject } from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, MotionPathPlugin);
}

const DOTS = '#workflow-dot, #workflow-dot-mid, #workflow-dot-core, #workflow-dot-trail-1, #workflow-dot-trail-2';
const COMET = '#workflow-dot, #workflow-dot-mid, #workflow-dot-core';

function pathOpts(id: string) {
  return { motionPath: { path: id, align: id, alignOrigin: [0.5, 0.5] as [number, number] } };
}

export function useWorkflowTimeline(
  containerRef: RefObject<HTMLDivElement | null>,
  onSequenceComplete: () => void
) {
  useGSAP(
    () => {
      const tl = gsap.timeline({ onComplete: onSequenceComplete });

      // ─── Helpers (defined inside useGSAP so GSAP scope applies) ───

      function activateNode(nodeId: string, t: number, isClimax = false) {
        const s = (cls: string) => `#${nodeId} ${cls}`;
        tl.fromTo(s('.workflow-outer-ring'), { scale: 1.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }, t);
        tl.fromTo(`#${nodeId}`, { scale: 0.92 }, { scale: isClimax ? 1.08 : 1, duration: 0.5, ease: 'back.out(1.7)' }, t);
        tl.to(s('.workflow-glow'), { opacity: 1, duration: 0.5 }, t);
        tl.to(s('.workflow-border-glow'), { opacity: 1, duration: 0.4 }, t);
        tl.to(s('.workflow-icon'), { opacity: 0.95, duration: 0.4 }, t + 0.1);
        tl.to(s('.workflow-label'), { opacity: 0.88, duration: 0.4 }, t + 0.1);
        tl.fromTo(s('.workflow-accent-line'), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.4, transformOrigin: 'left center' }, t + 0.08);
        tl.to(s('.workflow-metric'), { opacity: 1, duration: 0.4 }, t + 0.3);
        if (isClimax) {
          tl.to(s('.workflow-climax-glow'), { opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }, t);
        }
      }

      function travelDots(pathId: string, startT: number, dur = 0.5) {
        const endT = startT + dur;
        const sel = `#${pathId}`;
        tl.to(COMET, { ...pathOpts(sel), ease: 'power2.inOut', duration: dur }, startT);
        tl.to('#workflow-dot-trail-1', { ...pathOpts(sel), ease: 'power2.inOut', duration: Math.max(0.1, endT - (startT + 0.07)) }, startT + 0.07);
        tl.to('#workflow-dot-trail-2', { ...pathOpts(sel), ease: 'power2.inOut', duration: Math.max(0.1, endT - (startT + 0.14)) }, startT + 0.14);
      }

      // ─── Timeline ───

      // Node 1 ── t=0.3
      activateNode('node-1', 0.3);

      // Comet appear + travel 1→2 ── t=0.7
      tl.to(DOTS, { opacity: 1, duration: 0.12 }, 0.7);
      travelDots('path-1', 0.7);
      tl.to('#path-1', { opacity: 1, duration: 0.4 }, 0.75);

      // Node 2 ── t=1.22
      activateNode('node-2', 1.22);

      // Travel 2→3 ── t=1.6
      travelDots('path-2', 1.6);
      tl.to('#path-2', { opacity: 1, duration: 0.4 }, 1.65);

      // Node 3 ── t=2.12
      activateNode('node-3', 2.12);
      // Segments burst
      tl.to('#node-3 .workflow-segments-burst', { opacity: 1, duration: 0.08 }, 2.2);
      tl.fromTo('#node-3 .dot-green', { scale: 0, x: 0, y: 0 }, { scale: 1, x: -38, y: -24, duration: 0.4, ease: 'back.out(2.4)' }, 2.2);
      tl.fromTo('#node-3 .dot-amber', { scale: 0, x: 0, y: 0 }, { scale: 1, x: 0, y: -42, duration: 0.4, ease: 'back.out(2.4)' }, 2.25);
      tl.fromTo('#node-3 .dot-red', { scale: 0, x: 0, y: 0 }, { scale: 1, x: 38, y: -24, duration: 0.4, ease: 'back.out(2.4)' }, 2.3);
      tl.to('#node-3 .dot-green, #node-3 .dot-amber, #node-3 .dot-red', { opacity: 0, scale: 0, duration: 0.25 }, 2.7);

      // Travel 3→4 ── t=2.82
      travelDots('path-3', 2.82);
      tl.to('#path-3', { opacity: 1, duration: 0.4 }, 2.87);

      // Node 4 ── t=3.34
      activateNode('node-4', 3.34);
      // Ping ripple
      tl.to('#node-4 .workflow-ping-ripple', { opacity: 1, duration: 0.08 }, 3.42);
      tl.fromTo('#node-4 .ripple-circle', { scale: 0.4, opacity: 0.9 }, { scale: 3.5, opacity: 0, duration: 0.8, ease: 'power2.out' }, 3.42);

      // Travel 4→5 ── t=4.05
      travelDots('path-4', 4.05);
      tl.to('#path-4', { opacity: 1, duration: 0.4 }, 4.1);

      // Node 5 ── t=4.57
      activateNode('node-5', 4.57);

      // Travel 5→6 ── t=5.1
      travelDots('path-5', 5.1);
      tl.to('#path-5', { opacity: 1, duration: 0.4 }, 5.15);

      // Node 6 CLIMAX ── t=5.62
      activateNode('node-6', 5.62, true);

      // CHARGE UP ── t=6.0
      tl.to('.workflow-node, .workflow-path-active', { opacity: 0.45, duration: 0.07, yoyo: true, repeat: 6 }, 6.0);
      tl.to('.canvas-layer', { x: 3, y: -3, duration: 0.04, yoyo: true, repeat: 10 }, 6.0);
      tl.to('#node-6', { scale: 1.12, duration: 0.08, yoyo: true, repeat: 7, ease: 'power1.inOut' }, 6.0);

      // EXPLOSION ── t=6.45
      tl.to('.workflow-node, .workflow-path-active', { opacity: 0, duration: 0.7, ease: 'power3.in' }, 6.45);
      tl.to('.workflow-node', { scale: 2.2, duration: 0.7, ease: 'power3.in' }, 6.45);
      tl.to(DOTS, { opacity: 0, duration: 0.22 }, 6.45);

      // Flash
      tl.fromTo('#flash-overlay', { scale: 0, opacity: 1 }, { scale: 6, opacity: 0, duration: 1.5, ease: 'power2.out' }, 6.45);

      // Shockwave rings
      tl.fromTo('#shockwave-1', { scale: 0, opacity: 0.9 }, { scale: 12, opacity: 0, duration: 1.3, ease: 'power1.out' }, 6.45);
      tl.fromTo('#shockwave-2', { scale: 0, opacity: 0.6 }, { scale: 8,  opacity: 0, duration: 1.1, ease: 'power1.out' }, 6.6);
      tl.fromTo('#shockwave-3', { scale: 0, opacity: 0.4 }, { scale: 5,  opacity: 0, duration: 0.9, ease: 'power1.out' }, 6.75);
    },
    { scope: containerRef }
  );
}
