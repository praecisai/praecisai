export const easePremium = [0.25, 0.1, 0.25, 1] as const;
export const easeSnap = [0.17, 0.67, 0.29, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easePremium },
  },
};

// Vertical inset only. A bare '-100px' also shrinks the detection area
// horizontally by 100px per side, which on a 375px-wide phone leaves a band just
// 175px wide — short words near the edge of a centred heading (e.g. the "AI" in
// "AI payment recovery questions, answered") fall outside it, never trigger, and
// with `once: true` stay invisible for good.
export const viewportOnce = { once: true, margin: '-100px 0px' as const };

export const wordItem = {
  hidden: { opacity: 0, y: 48, filter: 'blur(10px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: i * 0.09, duration: 0.72, ease: easeSnap },
  }),
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: easePremium },
  },
};

export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.35, ease: easeSnap },
  },
};
