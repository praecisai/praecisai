'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DemoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  actionText: string;
  isExhausted: boolean;
  isSubmitting: boolean;
}

export default function DemoConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionText,
  isExhausted,
  isSubmitting
}: DemoConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--cream)] border border-[var(--caramel)] shadow-2xl"
      >
        <div className="p-5 sm:p-6">
          <h3 className="font-display text-xl font-semibold text-[var(--dark-brown)]">
            {title}
          </h3>
          <p className="mt-2 font-body text-[14px] text-[var(--walnut)]">
            {description}
          </p>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-2.5 font-body text-[14px] font-semibold text-[var(--walnut)] hover:bg-[var(--sand)] disabled:opacity-50"
            >
              {isExhausted ? 'Close' : 'Cancel'}
            </button>
            {isExhausted ? (
              <a
                href="mailto:contact@praecis.ai"
                className="flex items-center justify-center rounded-xl bg-[var(--mahogany)] px-5 py-2.5 font-display text-[14px] font-semibold text-white hover:bg-[var(--rust)]"
              >
                Talk to our team
              </a>
            ) : (
              <button
                onClick={onConfirm}
                disabled={isSubmitting}
                className="flex min-w-[120px] items-center justify-center rounded-xl bg-[var(--mahogany)] px-5 py-2.5 font-display text-[14px] font-semibold text-white hover:bg-[var(--rust)] disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : actionText}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
