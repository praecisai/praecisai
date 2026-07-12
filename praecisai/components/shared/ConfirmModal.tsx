'use client';

import { AlertTriangle, MessageCircle, Phone } from 'lucide-react';

type Variant = 'danger' | 'warning' | 'default';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  onConfirm: () => void;
  onCancel: () => void;
};

const VARIANTS = {
  danger:  { icon: AlertTriangle, iconColor: '#c62828', confirmBg: 'linear-gradient(135deg,#c62828,#b71c1c)', confirmText: '#fff' },
  warning: { icon: AlertTriangle, iconColor: '#e65100', confirmBg: 'linear-gradient(135deg,#7F5539,#9C6644)', confirmText: '#FFFDF9' },
  default: { icon: MessageCircle, iconColor: 'var(--mahogany)', confirmBg: 'linear-gradient(135deg,#7F5539,#9C6644)', confirmText: '#FFFDF9' },
};

export function ConfirmModal({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default', onConfirm, onCancel,
}: Props) {
  if (!open) return null;

  const cfg = VARIANTS[variant];
  const Icon = cfg.icon;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
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
            style={{ background: `${cfg.iconColor}18` }}
          >
            <Icon size={17} style={{ color: cfg.iconColor }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--dark-brown)' }}>{title}</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--walnut)' }}>{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-[rgba(127,85,57,0.06)]"
            style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: cfg.confirmBg, color: cfg.confirmText }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
