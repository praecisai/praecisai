import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { RefObject } from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, MotionPathPlugin);
}

export function useWorkflowTimeline(
  containerRef: RefObject<HTMLDivElement | null>,
  onSequenceComplete: () => void
) {
  useGSAP(
    () => {
      const tl = gsap.timeline({
        onComplete: () => {
          onSequenceComplete();
        },
      });

      // t=0.3s — Node 1
      tl.to('#node-1 .workflow-border-glow', { opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }, 0.3);
      tl.to('#node-1 .workflow-glow', { opacity: 1, duration: 0.4 }, 0.3);
      tl.fromTo('#node-1', { scale: 0.95 }, { scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, 0.3);

      // t=0.7s — Dot travels 1 -> 2
      tl.to('#workflow-dot, #workflow-dot-core', { opacity: 1, duration: 0.1 }, 0.7);
      tl.to('#workflow-dot, #workflow-dot-core', {
        motionPath: {
          path: '#path-1',
          align: '#path-1',
          alignOrigin: [0.5, 0.5],
        },
        duration: 0.5,
        ease: 'power2.inOut',
      }, 0.7);
      tl.to('#path-1', { opacity: 1, duration: 0.3 }, 0.8);

      // t=1.2s — Node 2
      tl.to('#node-2 .workflow-border-glow', { opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }, 1.2);
      tl.to('#node-2 .workflow-glow', { opacity: 1, duration: 0.4 }, 1.2);
      tl.fromTo('#node-2', { scale: 0.95 }, { scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, 1.2);

      // t=1.5s — Dot travels 2 -> 3
      tl.to('#workflow-dot, #workflow-dot-core', {
        motionPath: {
          path: '#path-2',
          align: '#path-2',
          alignOrigin: [0.5, 0.5],
        },
        duration: 0.5,
        ease: 'power2.inOut',
      }, 1.5);
      tl.to('#path-2', { opacity: 1, duration: 0.3 }, 1.6);

      // t=2.0s — Node 3
      tl.to('#node-3 .workflow-border-glow', { opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }, 2.0);
      tl.to('#node-3 .workflow-glow', { opacity: 1, duration: 0.4 }, 2.0);
      tl.fromTo('#node-3', { scale: 0.95 }, { scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, 2.0);
      
      // Node 3 Segments Burst
      tl.to('#node-3 .workflow-segments-burst', { opacity: 1, duration: 0.1 }, 2.1);
      tl.fromTo('#node-3 .dot-green', { scale: 0, x: 0, y: 0 }, { scale: 1, x: -30, y: -20, duration: 0.3, ease: 'back.out(2)' }, 2.1);
      tl.fromTo('#node-3 .dot-amber', { scale: 0, x: 0, y: 0 }, { scale: 1, x: 0, y: -30, duration: 0.3, ease: 'back.out(2)' }, 2.15);
      tl.fromTo('#node-3 .dot-red', { scale: 0, x: 0, y: 0 }, { scale: 1, x: 30, y: -20, duration: 0.3, ease: 'back.out(2)' }, 2.2);
      tl.to('#node-3 .dot-green, #node-3 .dot-amber, #node-3 .dot-red', { opacity: 0, scale: 0, duration: 0.2 }, 2.5);

      // t=2.6s — Dot travels 3 -> 4
      tl.to('#workflow-dot, #workflow-dot-core', {
        motionPath: {
          path: '#path-3',
          align: '#path-3',
          alignOrigin: [0.5, 0.5],
        },
        duration: 0.5,
        ease: 'power2.inOut',
      }, 2.6);
      tl.to('#path-3', { opacity: 1, duration: 0.3 }, 2.7);

      // t=3.1s — Node 4
      tl.to('#node-4 .workflow-border-glow', { opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }, 3.1);
      tl.to('#node-4 .workflow-glow', { opacity: 1, duration: 0.4 }, 3.1);
      tl.fromTo('#node-4', { scale: 0.95 }, { scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, 3.1);
      
      // Node 4 Ping Ripple
      tl.to('#node-4 .workflow-ping-ripple', { opacity: 1, duration: 0.1 }, 3.2);
      tl.fromTo('#node-4 .ripple-circle', { scale: 0.5, opacity: 1 }, { scale: 2.5, opacity: 0, duration: 0.6, ease: 'power2.out' }, 3.2);

      // t=3.7s — Dot travels 4 -> 5
      tl.to('#workflow-dot, #workflow-dot-core', {
        motionPath: {
          path: '#path-4',
          align: '#path-4',
          alignOrigin: [0.5, 0.5],
        },
        duration: 0.5,
        ease: 'power2.inOut',
      }, 3.7);
      tl.to('#path-4', { opacity: 1, duration: 0.3 }, 3.8);

      // t=4.2s — Node 5
      tl.to('#node-5 .workflow-border-glow', { opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }, 4.2);
      tl.to('#node-5 .workflow-glow', { opacity: 1, duration: 0.4 }, 4.2);
      tl.fromTo('#node-5', { scale: 0.95 }, { scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, 4.2);

      // t=4.7s — Dot travels 5 -> 6
      tl.to('#workflow-dot, #workflow-dot-core', {
        motionPath: {
          path: '#path-5',
          align: '#path-5',
          alignOrigin: [0.5, 0.5],
        },
        duration: 0.5,
        ease: 'power2.inOut',
      }, 4.7);
      tl.to('#path-5', { opacity: 1, duration: 0.3 }, 4.8);

      // t=5.2s — Node 6 Climax
      tl.to('#node-6 .workflow-climax-glow', { opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }, 5.2);
      tl.to('#node-6 .workflow-glow', { opacity: 1, duration: 0.4 }, 5.2);
      tl.fromTo('#node-6', { scale: 0.9 }, { scale: 1.05, duration: 0.4, ease: 'back.out(1.4)' }, 5.2);

      // t=5.5s — CHARGE UP
      tl.to('.workflow-node, .workflow-path-active', { opacity: 0.6, duration: 0.1, yoyo: true, repeat: 3 }, 5.5);
      tl.to('.canvas-layer', { x: 2, y: -2, duration: 0.05, yoyo: true, repeat: 6 }, 5.5);

      // t=5.9s — EXPLOSION
      tl.to('.workflow-node, .workflow-path-active', { opacity: 0, duration: 0.8, ease: 'power2.in' }, 5.9);
      tl.to('.workflow-node', { scale: 1.5, duration: 0.8, ease: 'power3.in' }, 5.9);
      tl.to('#workflow-dot, #workflow-dot-core', { opacity: 0, duration: 0.3 }, 5.9);
      
      // Radial white flash
      tl.fromTo('#flash-overlay', 
        { scale: 0, opacity: 0.8 }, 
        { scale: 4, opacity: 0, duration: 1.2, ease: 'power2.out' }, 
        5.9
      );

    },
    { scope: containerRef }
  );
}
