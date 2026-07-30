'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconPlus, IconMinus } from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';
import { itemVariants, sectionVariants, viewportOnce } from './motion';
import AnimatedHeading from './AnimatedHeading';
import { coreFaqs as faqs } from '@/lib/content/faqs';

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

function FaqItem({ question, answer, id }: { question: string; answer: string; id: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('border-b border-[var(--caramel)] last:border-b-0 transition-colors', open && 'bg-[var(--sand)]/[0.3]')}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-display text-[14px] font-semibold text-[var(--dark-brown)] sm:text-[15px]">
          {question}
        </span>
        <div className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
          open
            ? 'border-[var(--mahogany)] bg-[var(--mahogany)] text-[var(--cream)]'
            : 'border-[var(--caramel)] bg-[var(--surface-warm)] text-[var(--walnut)]'
        )}>
          {open
            ? <IconMinus size={14} stroke={2.5} />
            : <IconPlus size={14} stroke={2.5} />
          }
        </div>
      </button>

      {/* Answer stays mounted (collapsed) so crawlers and text extraction can read it */}
      <motion.div
        id={id}
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-6 text-left font-body text-[14px] leading-[1.75] text-[var(--walnut)]">
          {answer}
        </p>
      </motion.div>
    </div>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="bg-[var(--cream)] px-5 py-14 sm:px-8 sm:py-28 text-center">
      {/* FAQPage structured data — enables expandable FAQ results in Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <motion.div
        className="mx-auto w-full max-w-3xl"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {/* Eyebrow + heading */}
        <motion.p
          variants={itemVariants}
          className="mb-3 text-center font-body text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rust)]"
        >
          FAQ
        </motion.p>
        <AnimatedHeading
          text="AI payment recovery questions, answered"
          className="text-[1.5rem] sm:text-[clamp(1.75rem,4vw,2.625rem)] text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
        />
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-4 max-w-md text-center font-body text-[15px] leading-relaxed text-[var(--walnut)]"
        >
          Everything you need to know before getting started.
        </motion.p>

        {/* Accordion */}
        <motion.div
          variants={itemVariants}
          className="mt-12 overflow-hidden rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-[0_4px_24px_rgba(127,85,57,0.06)]"
        >
          {faqs.map((faq, i) => (
            <FaqItem
              key={faq.question}
              id={`faq-answer-${i}`}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </motion.div>

        {/* Still have questions? */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-2"
        >
          <p className="font-body text-[14px] text-[var(--walnut)]">Still have questions?</p>
          <Link
            href="/faq"
            className="font-body text-[14px] font-semibold text-[var(--mahogany)] underline underline-offset-4 hover:text-[var(--rust)]"
          >
            Read the full FAQ
          </Link>
          <span className="hidden font-body text-[14px] text-[var(--walnut)] sm:inline">·</span>
          <a
            href="mailto:hello@praecisai.in"
            className="font-body text-[14px] font-semibold text-[var(--mahogany)] underline underline-offset-4 hover:text-[var(--rust)]"
          >
            hello@praecisai.in
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
