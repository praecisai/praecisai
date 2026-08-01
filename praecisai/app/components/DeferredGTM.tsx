'use client';

import { useEffect, useState } from 'react';
import { GoogleTagManager } from '@next/third-parties/google';

/**
 * Loads Google Tag Manager (which in turn injects gtag + the Meta/Facebook
 * pixel + CAPI helper, ~450 KB of third-party JS) only once it can no longer
 * hurt the initial render. This is the widely-used "lazy third-party" pattern:
 *
 *   • Fire on the FIRST real user gesture (scroll / tap / key), which covers
 *     virtually every engaged visitor within the first moment, OR
 *   • Fall back to `requestIdleCallback` AFTER the window `load` event, so a
 *     visitor who never interacts is still tracked — just once the page has
 *     finished loading and the main thread is idle, never during it.
 *
 * No tracking is dropped (every visitor still triggers one path); the heavy
 * scripts simply move off the critical path, which is what tanks LCP/TBT on
 * throttled mobile.
 */
export function DeferredGTM({ gtmId }: { gtmId: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    let done = false;
    const events = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const;
    const idleWin = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };

    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, trigger));
      window.removeEventListener('load', onLoad);
    };
    const trigger = () => {
      if (done) return;
      done = true;
      cleanup();
      setReady(true);
    };

    // Idle-after-load fallback for visitors who never interact.
    const scheduleIdle = () =>
      idleWin.requestIdleCallback
        ? idleWin.requestIdleCallback(trigger, { timeout: 6000 })
        : window.setTimeout(trigger, 5000);
    const onLoad = () => scheduleIdle();

    events.forEach((e) =>
      window.addEventListener(e, trigger, { passive: true, once: true }),
    );
    if (document.readyState === 'complete') scheduleIdle();
    else window.addEventListener('load', onLoad, { once: true });

    return cleanup;
  }, [ready]);

  return ready ? <GoogleTagManager gtmId={gtmId} /> : null;
}
