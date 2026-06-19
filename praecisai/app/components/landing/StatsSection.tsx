'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { itemVariants, sectionVariants, viewportOnce } from './motion';

const stats = [
  {
    prefix: '₹',
    value: 2.3,
    suffix: 'Cr+',
    label: 'Outstanding tracked across pilots',
  },
  {
    prefix: '',
    value: 43,
    suffix: ' days',
    label: 'Average recovery time reduced to',
  },
  {
    prefix: '',
    value: 3.2,
    suffix: '×',
    label: 'More parties contacted vs manual calling',
  },
];

function AnimatedStat({
  prefix,
  value,
  suffix,
  label,
}: {
  prefix: string;
  value: number;
  suffix: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!isInView) return;

    const duration = 1600; // ms
    const steps = 60;
    const stepDuration = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // easeOut cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * value;
      setDisplay(Number.isInteger(value) ? Math.round(current).toString() : current.toFixed(1));

      if (step >= steps) clearInterval(timer);
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <div ref={ref} className="flex flex-1 flex-col items-center px-8 py-12 text-center">
      <span className="font-display font-bold text-[var(--cream)]"
        style={{ fontSize: 'clamp(2.25rem, 5vw, 3.25rem)' }}
      >
        {prefix}{display}{suffix}
      </span>
      <p className="mt-4 max-w-[200px] font-body text-[13px] leading-[1.6] text-[var(--sand)]">
        {label}
      </p>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="bg-[var(--mahogany)] px-5 py-24 sm:px-8 sm:py-28 text-center">
      <motion.div
        className="mx-auto w-full max-w-5xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col divide-y divide-[rgba(237,224,212,0.12)] sm:flex-row sm:divide-x sm:divide-y-0"
        >
          {stats.map((stat) => (
            <AnimatedStat
              key={stat.label}
              prefix={stat.prefix}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
