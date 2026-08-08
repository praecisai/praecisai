/**
 * Anchor scrolling that survives `content-visibility: auto`.
 *
 * Landing sections carry `contain-intrinsic-size: auto 700px`, so every section
 * the browser has not rendered yet is a 700px guess. A single scrollIntoView
 * aims at coordinates computed from those guesses; as the sections in between
 * actually render, their real heights replace the guess and the target slides
 * out from under the scroll. That is why "Try demo" sometimes stops short of
 * the demo section.
 *
 * Fix: after the initial scroll, keep re-aiming until the target stops moving.
 * Each correction is a cheap rect read, and it converges in a few frames once
 * the intermediate sections have resolved.
 */

/** Matches html { scroll-padding-top } so a settled target reads as top ≈ pad. */
function scrollPadding(): number {
  if (typeof window === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).scrollPaddingTop;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

const TOLERANCE_PX = 4;
const RETRY_MS = 200;
const GIVE_UP_MS = 1600;

/**
 * Deliberately NOT scrollIntoView. The `#demo` style targets are zero-height
 * marker divs inside sections that carry paint containment from
 * content-visibility, and against those scrollIntoView({block:'start'})
 * consistently lands ~80px past the scroll-padding line and does not
 * self-correct on a second call. Computing the absolute Y ourselves lands
 * exactly on the padding line, first try, every time.
 */
function targetFor(el: HTMLElement, pad: number): number {
  return window.scrollY + el.getBoundingClientRect().top - pad;
}

export function scrollToSection(id: string, opts: { updateHash?: boolean } = {}) {
  const el = document.getElementById(id);
  if (!el) return;

  const pad = scrollPadding();
  window.scrollTo({ top: targetFor(el, pad), behavior: 'smooth' });
  if (opts.updateHash !== false) {
    window.history.replaceState(null, '', `#${id}`);
  }

  // Any deliberate scroll by the user wins immediately: never fight their input.
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  window.addEventListener('wheel', cancel, { passive: true, once: true });
  window.addEventListener('touchstart', cancel, { passive: true, once: true });
  window.addEventListener('keydown', cancel, { once: true });

  const deadline = Date.now() + GIVE_UP_MS;

  const reaim = () => {
    if (cancelled || Date.now() > deadline) return;
    const drift = el.getBoundingClientRect().top - pad;
    if (Math.abs(drift) > TOLERANCE_PX) {
      window.scrollTo({ top: targetFor(el, pad), behavior: 'smooth' });
    }
    window.setTimeout(reaim, RETRY_MS);
  };
  window.setTimeout(reaim, RETRY_MS);
}

/** Click handler for in-page anchors: `onClick={(e) => handleAnchorClick(e, 'demo')}` */
export function handleAnchorClick(e: React.MouseEvent, id: string) {
  e.preventDefault();
  scrollToSection(id);
}
