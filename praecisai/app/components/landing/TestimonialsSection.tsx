'use client';

import { motion } from 'framer-motion';
import { IconStarFilled, IconQuote } from '@tabler/icons-react';
import { itemVariants, sectionVariants, viewportOnce } from './motion';
import AnimatedHeading from './AnimatedHeading';

const testimonials = [
  {
    quote:
      'We were manually calling 200 parties a week. PraecisAI does it overnight. Recovery improved 40% in month one.',
    name: 'Rajesh Mehta',
    company: 'Mehta Textiles, Surat',
    initials: 'RM',
  },
  {
    quote:
      'The WhatsApp messages feel personal. Parties actually respond. Our follow-up time dropped from 2 weeks to 3 days.',
    name: 'Priya Sharma',
    company: 'Sharma Distributors, Jaipur',
    initials: 'PS',
  },
  {
    quote:
      'Owner report every Monday changed everything. I finally know exactly which accounts need my attention.',
    name: 'Sunil Agarwal',
    company: 'Agarwal & Sons, Mumbai',
    initials: 'SA',
  },
  {
    quote:
      'Hindi voice calls work better than English. Customers respond. Promises get made. And they actually get kept.',
    name: 'Kavita Patel',
    company: 'Patel Garments, Ahmedabad',
    initials: 'KP',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-[var(--sand)] px-5 py-28 sm:px-8 sm:py-36 text-center">
      <motion.div
        className="mx-auto w-full max-w-6xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Eyebrow + heading */}
        <motion.p
          variants={itemVariants}
          className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rust)]"
        >
          Testimonials
        </motion.p>
        <AnimatedHeading
          text="Trusted by collections teams across India"
          className="text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
        />

        {/* Testimonial grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col justify-between rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-7 sm:p-8"
            >
              {/* Quote icon */}
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <IconStarFilled key={i} size={14} className="text-[var(--rust)]" />
                    ))}
                  </div>
                  <IconQuote
                    size={24}
                    className="text-[var(--mahogany)]"
                    stroke={1.5}
                  />
                </div>
                <p className="font-body text-[15px] leading-[1.75] text-[var(--dark-brown)]">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </div>

              {/* Author */}
              <div className="mt-8 flex items-center gap-3 border-t border-[rgba(221,184,146,0.4)] pt-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sand)] font-display text-sm font-bold text-[var(--mahogany)]">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-display text-[14px] font-semibold text-[var(--dark-brown)]">
                    {testimonial.name}
                  </p>
                  <p className="font-body text-[12px] text-[var(--walnut)]">
                    {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
