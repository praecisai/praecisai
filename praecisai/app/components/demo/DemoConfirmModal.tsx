'use client';

import { Loader2, AlertTriangle, MessageCircle, Phone } from 'lucide-react';

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
  isSubmitting,
}: DemoConfirmModalProps) {
  if (!isOpen) return null;

  const isCall = actionText.toLowerCase().includes('call');
  const IconEl = isCall ? Phone : MessageCircle;
  const iconColor = isCall ? 'var(--mahogany)' : 'var(--recovery-green)';
  const iconBg   = isCall ? 'rgba(127,85,57,0.12)' : 'rgba(74,124,89,0.12)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-sm p-6 flex flex-col gap-4"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}
          >
            {isExhausted
              ? <AlertTriangle size={17} style={{ color: '#e65100' }} strokeWidth={1.75} />
              : <IconEl size={17} style={{ color: iconColor }} strokeWidth={1.75} />
            }
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--dark-brown)' }}>{title}</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--walnut)' }}>{description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-[rgba(127,85,57,0.06)] disabled:opacity-50"
            style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)' }}
          >
            {isExhausted ? 'Close' : 'Cancel'}
          </button>
          {isExhausted ? (
            <a
              href="mailto:contact@praecis.ai"
              className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7F5539,#9C6644)', color: '#FFFDF9' }}
            >
              Talk to our team
            </a>
          ) : (
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex min-w-[110px] items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg,#7F5539,#9C6644)', color: '#FFFDF9' }}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : actionText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
