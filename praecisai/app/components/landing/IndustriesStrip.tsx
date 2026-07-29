'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconArrowRight, IconShirt, IconVaccine, IconTool } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce, scaleIn } from './motion';
import AnimatedHeading from './AnimatedHeading';

/**
 * Homepage hub linking out to the industry pages. Keeps link equity flowing
 * from the highest-authority page to the long-tail landing pages.
 */
const industries = [
  {
    icon: IconShirt,
    name: 'Textile & Garments',
    href: '/industries/textile-garments',
    blurb: 'Hundreds of credit accounts on 90 to 200+ day cycles, chased without damaging the relationship.',
  },
  {
    icon: IconVaccine,
    name: 'Pharma Distribution',
    href: '/industries/pharma-distribution',
    blurb: 'A long tail of chemist accounts that finally gets followed up, so field staff go back to selling.',
  },
  {
    icon: IconTool,
    name: 'Hardware & Building',
    href: '/industries/hardware-building-materials',
    blurb: 'Project-linked payments chased across months, with every promised date logged and called back.',
  },
];

export default function IndustriesStrip() {
  return (
    <section
      id="industries"
      style={{ scrollMarginTop: '88px' }}
      className="bg-[var(--sand)] px-4 py-16 sm:px-8 sm:py-28 text-center"
    >
      <motion.div
        className="mx-auto w-full max-w-6xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <motion.p
          variants={itemVariants}
          className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rust)]"
        >
          Industries
        </motion.p>
        <AnimatedHeading
          text="Built for how your industry sells on credit"
          className="mx-auto max-w-2xl text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
        />
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-4 sm:mt-5 max-w-2xl text-center font-body text-[13px] sm:text-[15px] leading-relaxed text-[var(--walnut)]"
        >
          Ageing buckets, escalation ladder and call tone configured to your trade, not a generic
          30-day template.
        </motion.p>

        <div className="mt-8 sm:mt-14 grid gap-4 sm:gap-6 md:grid-cols-3">
          {industries.map((industry, index) => (
            <motion.div key={industry.href} variants={scaleIn} transition={{ delay: index * 0.12 }}>
              <Link
                href={industry.href}
                className="group flex h-full flex-col rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-5 text-left transition-all duration-200 hover:border-[var(--mahogany)] hover:shadow-[0_16px_48px_rgba(127,85,57,0.14)] sm:p-8"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--mahogany)]">
                  <industry.icon size={24} stroke={1.75} />
                </div>
                <h3 className="font-display text-[15px] font-semibold leading-snug text-[var(--dark-brown)] sm:text-[18px]">
                  {industry.name}
                </h3>
                <p className="mt-2.5 flex-1 font-body text-[12px] leading-[1.7] text-[var(--walnut)] sm:text-[14px]">
                  {industry.blurb}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-body text-[13px] font-semibold text-[var(--mahogany)]">
                  See the details
                  <IconArrowRight
                    size={14}
                    stroke={2}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
