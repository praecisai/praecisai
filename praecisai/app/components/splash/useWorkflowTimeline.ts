import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { RefObject } from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, MotionPathPlugin);
}

const DOTS = '#workflow-dot, #workflow-dot-mid, #workflow-dot-core, #workflow-dot-trail-1, #workflow-dot-trail-2';
const COMET = '#workflow-dot, #workflow-dot-mid, #workflow-dot-core';

function motionOpts(i: number) {
  const id = `#motion-path-${i}`;
  return { motionPath: { path: id, align: id, alignOrigin: [0.5, 0.5] as [number, number] } };
}

export function useWorkflowTimeline(
  containerRef: RefObject<HTMLDivElement | null>,
  onSequenceComplete: () => void,
  enabled: boolean
) {
  useGSAP(
    () => {
      if (!enabled) return;

      const tl = gsap.timeline();

      // ─── Node activation ───────────────────────────────────────
      function activateNode(nodeId: string, t: number, isClimax = false) {
        const s = (cls: string) => `#${nodeId} ${cls}`;

        tl.fromTo(s('.workflow-outer-ring'),
          { scale: 2.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out' }, t);

        tl.fromTo(s('.workflow-outer-ring-2'),
          { scale: 1.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8, ease: 'expo.out' }, t + 0.06);

        tl.fromTo(`#${nodeId}`,
          { scale: 0.78, y: 8, opacity: 0.3 },
          { scale: isClimax ? 1.06 : 1.0, y: 0, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' }, t);

        tl.to(s('.workflow-glow'),        { opacity: 1, duration: 0.65, ease: 'power3.out' }, t);
        tl.to(s('.workflow-border-glow'), { opacity: 1, duration: 0.5,  ease: 'power2.out' }, t + 0.06);
        tl.to(s('.workflow-icon'),        { opacity: 1, duration: 0.4,  ease: 'power2.out' }, t + 0.14);

        tl.fromTo(s('.workflow-label'),
          { opacity: 0, y: 4 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }, t + 0.16);

        tl.fromTo(s('.workflow-step'),
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, t + 0.08);

        tl.fromTo(s('.workflow-active-dot'),
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, t + 0.22);

        tl.fromTo(s('.workflow-accent-line'),
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.5, ease: 'power3.out', transformOrigin: 'left center' }, t + 0.1);

        tl.fromTo(s('.workflow-metric'),
          { opacity: 0, y: 3 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, t + 0.32);

        if (isClimax) {
          tl.to(s('.workflow-climax-glow'), { opacity: 1, duration: 0.6, ease: 'power2.out' }, t + 0.05);
        }
      }

      // ─── Comet travel + line draws behind the ball ─────────────
      function travelAndLight(pathIndex: number, startT: number, dur = 0.6) {
        const endT = startT + dur;
        const ease = 'power2.inOut';

        // Comet head + trails along the invisible center-to-center motion path
        tl.to(COMET,               { ...motionOpts(pathIndex), ease, duration: dur },                                        startT);
        tl.to('#workflow-dot-trail-1', { ...motionOpts(pathIndex), ease, duration: Math.max(0.08, endT - (startT + 0.07)) }, startT + 0.07);
        tl.to('#workflow-dot-trail-2', { ...motionOpts(pathIndex), ease, duration: Math.max(0.08, endT - (startT + 0.14)) }, startT + 0.14);

        // Line draws left-to-right in sync with the comet.
        // strokeDashoffset: 84 → 0 means the path "grows" from its start point.
        // Same ease + same duration keeps the drawn segment tip aligned with the ball.
        tl.to(`#path-${pathIndex}`,      { strokeDashoffset: 0, duration: dur, ease },        startT);
        tl.to(`#path-${pathIndex}-core`, { strokeDashoffset: 0, duration: dur, ease: 'power2.inOut' }, startT + 0.04);
      }

      // ─── Sequence ───────────────────────────────────────────────

      activateNode('node-1', 0.3);

      tl.to(DOTS, { opacity: 1, duration: 0.12 }, 0.85);
      travelAndLight(1, 0.85);

      activateNode('node-2', 1.47);
      travelAndLight(2, 2.0);

      activateNode('node-3', 2.62);
      travelAndLight(3, 3.15);

      activateNode('node-4', 3.77);
      tl.to('#node-4 .workflow-ping-ripple', { opacity: 1, duration: 0.1 }, 3.9);
      tl.fromTo('#node-4 .ripple-circle',
        { scale: 0.3, opacity: 0.8 },
        { scale: 3.2, opacity: 0, duration: 0.75, ease: 'power3.out' }, 3.9);

      travelAndLight(4, 4.55);
      activateNode('node-5', 5.17);
      travelAndLight(5, 5.7);

      // ── CLIMAX: node-6 activates ──
      activateNode('node-6', 6.32, true);
      tl.to(DOTS, { opacity: 0, duration: 0.25, ease: 'power2.out' }, 6.32);

      // ── BLAST ────────────────────────────────────────────────────
      //
      // Phase 1 — Smooth charge pulse (t=6.85):
      //   All nodes + paths breathe in/out with sine.inOut — feels alive,
      //   not jarring. 8 half-cycles × 0.13s = ~1s of build-up.
      //
      tl.to('.workflow-node, .workflow-path-active',
        { opacity: 0.35, duration: 0.13, ease: 'sine.inOut', yoyo: true, repeat: 7 }, 6.85);

      // node-6 independently pumps in size during charge
      tl.to('#node-6',
        { scale: 1.16, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 6.85);

      // Canvas breathes — gentle sway, not hard jitter
      tl.to('.canvas-layer',
        { x: 3, y: -2, duration: 0.11, ease: 'sine.inOut', yoyo: true, repeat: 11 }, 6.88);

      // Phase 2 — Surge (t=7.46): all nodes flash peak-bright for one beat
      tl.to('.workflow-node',
        { opacity: 1, scale: 1.06, duration: 0.10, ease: 'power2.out' }, 7.46);

      // Phase 3 — Explosion (t=7.56): nodes scatter outward + everything fades
      tl.to('.workflow-node, .workflow-path-active, .workflow-path-rail, [id$="-core"]',
        { opacity: 0, duration: 0.72, ease: 'power3.in' }, 7.56);
      tl.to('.workflow-node',
        { scale: 2.4, duration: 0.72, ease: 'power2.in' }, 7.56);

      // Logo reveal fires right as blast hits — logo fades in through the expanding glow
      tl.call(onSequenceComplete, [], 8.0);

      // Flash bloom — exponential radial expand
      tl.fromTo('#flash-overlay',
        { scale: 0, opacity: 1 },
        { scale: 7.5, opacity: 0, duration: 1.75, ease: 'expo.out' }, 7.56);

      // Shockwave rings — staggered smooth expand
      tl.fromTo('#shockwave-1',
        { scale: 0.1, opacity: 0.9 },
        { scale: 20,  opacity: 0, duration: 1.6, ease: 'expo.out' }, 7.56);
      tl.fromTo('#shockwave-2',
        { scale: 0.1, opacity: 0.65 },
        { scale: 15,  opacity: 0, duration: 1.4, ease: 'expo.out' }, 7.70);
      tl.fromTo('#shockwave-3',
        { scale: 0.1, opacity: 0.45 },
        { scale: 11,  opacity: 0, duration: 1.2, ease: 'expo.out' }, 7.85);
    },
    { scope: containerRef, dependencies: [enabled] }
  );
}
