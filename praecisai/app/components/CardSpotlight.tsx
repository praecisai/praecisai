'use client';

/**
 * Injects a real DOM overlay div (.spotlight-card-glow) into every .spotlight-card.
 * Updates background directly via style.background — no CSS variable intermediary,
 * so the glow renders instantly with zero cross-browser issues.
 */

import { useEffect } from 'react';

const RADIUS  = 300;
const GLOW    = '156, 102, 68';   // PraecisAI rust
const GLOW2   = '221, 184, 146';  // caramel

const OVERLAY_CSS = `
  position:absolute; inset:0; border-radius:inherit; padding:5px;
  pointer-events:none; z-index:10; opacity:0;
  transition:opacity 0.15s ease;
  -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite:exclude;
`.replace(/\s+/g, ' ').trim();

function getOrCreateOverlay(card: HTMLElement): HTMLDivElement {
  let overlay = card.querySelector<HTMLDivElement>('.spotlight-card-glow');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'spotlight-card-glow';
    overlay.style.cssText = OVERLAY_CSS;
    card.appendChild(overlay);
  }
  return overlay;
}

export default function CardSpotlight() {
  useEffect(() => {
    const cards = () => document.querySelectorAll<HTMLElement>('.spotlight-card');

    const onMove = (e: MouseEvent) => {
      cards().forEach(card => {
        const overlay = getOrCreateOverlay(card);
        const r = card.getBoundingClientRect();
        const gx = ((e.clientX - r.left) / r.width)  * 100;
        const gy = ((e.clientY - r.top)  / r.height) * 100;

        // proximity-based intensity
        const cx = r.left + r.width / 2;
        const cy = r.top  + r.height / 2;
        const dist = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(r.width, r.height) / 2);
        const PROX = RADIUS * 0.5, FADE = RADIUS * 0.85;
        const intensity = dist <= PROX ? 1 : dist <= FADE ? (FADE - dist) / (FADE - PROX) : 0;

        overlay.style.background = `radial-gradient(${RADIUS}px circle at ${gx}% ${gy}%, rgba(${GLOW},${(intensity * 0.9).toFixed(2)}) 0%, rgba(${GLOW2},${(intensity * 0.45).toFixed(2)}) 38%, transparent 65%)`;
        overlay.style.opacity    = intensity > 0.01 ? '1' : '0';
      });
    };

    // mouseenter fires immediately — no waiting for first mousemove
    const attach = () => {
      cards().forEach(card => {
        if (card.dataset.spotlightBound === '1') return;
        card.dataset.spotlightBound = '1';

        card.addEventListener('mouseenter', (e: Event) => {
          const me = e as MouseEvent;
          const overlay = getOrCreateOverlay(card);
          const r = card.getBoundingClientRect();
          const gx = ((me.clientX - r.left) / r.width)  * 100;
          const gy = ((me.clientY - r.top)  / r.height) * 100;
          overlay.style.background = `radial-gradient(${RADIUS}px circle at ${gx}% ${gy}%, rgba(${GLOW},0.9) 0%, rgba(${GLOW2},0.45) 38%, transparent 65%)`;
          overlay.style.opacity    = '1';
        });

        card.addEventListener('mouseleave', () => {
          const overlay = card.querySelector<HTMLDivElement>('.spotlight-card-glow');
          if (overlay) overlay.style.opacity = '0';
        });
      });
    };

    // Keep attaching as new cards mount
    const mo = new MutationObserver(attach);
    mo.observe(document.body, { childList: true, subtree: true });
    attach();

    document.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMove);
      mo.disconnect();
    };
  }, []);

  return null;
}
