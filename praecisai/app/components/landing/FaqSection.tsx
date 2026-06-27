'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconPlus, IconMinus } from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';
import { itemVariants, sectionVariants, viewportOnce } from './motion';
import AnimatedHeading from './AnimatedHeading';

const faqs = [
  {
    question: 'Does it work with any Excel format?',
    answer:
      "Yes. Our column mapping system auto-detects your headers. Whether you call it 'Party Name' or 'Customer' or 'Client', it maps correctly. You only set it up once.",
  },
  {
    question: "Will my customers know it's automated?",
    answer:
      'No. Messages are personalized with their name, bill number, and due amount. Voice calls sound natural in Hindi. There is no generic broadcast feel.',
  },
  {
    question: 'What if a customer disputes the amount?',
    answer:
      "Disputes are flagged and routed to your team immediately. PraecisAI doesn't argue, it escalates intelligently so a human can step in.",
  },
  {
    question: 'Is our data secure?',
    answer:
      'All data is encrypted in transit and at rest using industry-standard encryption. We never share your customer data with any third party, ever.',
  },
  {
    question: 'How long does setup take?',
    answer:
      "Under 30 minutes. Upload your Excel, map columns once, configure your message templates, and you're live. Our onboarding team walks you through it.",
  },
  {
    question: 'Can I set custom follow-up rules?',
    answer:
      'Yes. You can customize segment thresholds, message timing, escalation triggers, and tone per business. Full control stays with you.',
  },
  {
    question: 'What languages are supported?',
    answer:
      'Hindi and English currently. Regional language support (Gujarati, Marathi) is coming soon, expected Q3 2026.',
  },
  {
    question: 'Is there a contract?',
    answer:
      'No. Monthly subscription only. Cancel anytime from your dashboard, no questions asked, no notice period required.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('border-b border-[var(--caramel)] last:border-b-0 transition-colors', open && 'bg-[var(--sand)]/[0.3]')}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
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

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 text-left font-body text-[14px] leading-[1.75] text-[var(--walnut)]">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="bg-[var(--cream)] px-5 py-24 sm:px-8 sm:py-28 text-center">
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
          text="Questions, answered"
          className="text-center font-display font-semibold leading-[1.15] text-[var(--dark-brown)]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.625rem)' }}
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
          {faqs.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </motion.div>

        {/* Still have questions? */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-2"
        >
          <p className="font-body text-[14px] text-[var(--walnut)]">Still have questions?</p>
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
