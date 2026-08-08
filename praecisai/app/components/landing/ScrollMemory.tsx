'use client';

import { useEffect } from 'react';

/**
 * Keeps the reader's place across a refresh.
 *
 * The browser's own scroll restoration replays a raw pixel offset. On a fresh
 * load every off-screen landing section is a `contain-intrinsic-size` placeholder
 * (700px), so that pixel offset points at entirely different content, and the
 * view slides again as the real heights resolve. That is the "refresh jumps me
 * somewhere else" bug.
 *
 * Instead of a pixel offset we remember WHICH section the reader was in and how
 * far into it they had scrolled. Section index survives the placeholder phase,
 * so restoring is accurate no matter what the estimated heights were.
 *
 * Only fires for reloads and back/forward. Arriving at the homepage fresh from
 * another page still starts at the top, as it should.
 */

const KEY = 'praecis:landing-scroll';
const SETTLE_MS = 180;
const GIVE_UP_MS = 2000;
const TOLERANCE_PX = 4;

function padding(): number {
  const n = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return Number.isFinite(n) ? n : 0;
}

function blocks(): HTMLElement[] {
  const root = document.querySelector('.landing-page');
  if (!root) return [];
  return Array.from(root.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.offsetParent !== null,
  );
}

export default function ScrollMemory() {
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    let frame = 0;
    const save = () => {
      frame = 0;
      const pad = padding();
      let found: { index: number; offset: number } | null = null;
      blocks().forEach((el, index) => {
        const top = el.getBoundingClientRect().top - pad;
        if (top <= 1) found = { index, offset: -top };
      });
      if (found && window.scrollY > 0) {
        sessionStorage.setItem(KEY, JSON.stringify(found));
      } else {
        sessionStorage.removeItem(KEY);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(save);
    };

    // A hash target owns the scroll position: never override it.
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReplay = nav?.type === 'reload' || nav?.type === 'back_forward';

    if (isReplay && !window.location.hash) {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        try {
          const { index, offset } = JSON.parse(raw) as { index: number; offset: number };
          let cancelled = false;
          const stop = () => {
            cancelled = true;
          };
          window.addEventListener('wheel', stop, { passive: true, once: true });
          window.addEventListener('touchstart', stop, { passive: true, once: true });

          const deadline = Date.now() + GIVE_UP_MS;
          // Re-aim until the sections above stop resizing: each pass lands
          // closer as placeholders are replaced by real content.
          const aim = () => {
            if (cancelled || Date.now() > deadline) return;
            const el = blocks()[index];
            if (!el) return;
            const drift = el.getBoundingClientRect().top - padding() + offset;
            if (Math.abs(drift) > TOLERANCE_PX) {
              window.scrollBy({ top: drift, behavior: 'instant' as ScrollBehavior });
              window.setTimeout(aim, SETTLE_MS);
            }
          };
          aim();
        } catch {
          sessionStorage.removeItem(KEY);
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
      history.scrollRestoration = previous;
    };
  }, []);

  return null;
}
