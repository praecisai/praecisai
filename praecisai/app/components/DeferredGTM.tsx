'use client';

import { useEffect, useState } from 'react';
import { GoogleTagManager } from '@next/third-parties/google';

/**
 * Loads Google Tag Manager (which in turn injects gtag + the Meta/Facebook
 * pixel) only AFTER the page is interactive — on the first real user gesture,
 * or a 3.5s fallback. The GTM container pulls ~370 KB of third-party JS; keeping
 * it off the initial main thread is the single biggest TBT/LCP win on mobile.
 *
 * Tracking is preserved: every engaged visitor triggers it on their first
 * scroll/tap/keypress, and idle visitors still load it after the timeout.
 */
export function DeferredGTM({ gtmId }: { gtmId: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    let done = false;
    const events = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const;

    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, trigger));
    };
    const trigger = () => {
      if (done) return;
      done = true;
      cleanup();
      setReady(true);
    };

    events.forEach((e) =>
      window.addEventListener(e, trigger, { passive: true, once: true }),
    );
    const timer = window.setTimeout(trigger, 3500);

    return () => {
      window.clearTimeout(timer);
      cleanup();
    };
  }, [ready]);

  return ready ? <GoogleTagManager gtmId={gtmId} /> : null;
}
