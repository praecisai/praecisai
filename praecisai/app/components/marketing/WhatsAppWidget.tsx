'use client';

import { useEffect, useState } from 'react';
import { IconBrandWhatsapp } from '@tabler/icons-react';

const WHATSAPP_URL = 'https://wa.me/918291485811';

/**
 * Floating WhatsApp button.
 *
 * Pure outbound link, no backend. The label expands once the visitor has
 * scrolled past ~65% of the page without leaving, as a light nudge for
 * otherwise-lost visitors.
 */
export default function WhatsAppWidget() {
  const [nudge, setNudge] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      setNudge(window.scrollY / scrollable > 0.65);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [dismissed]);

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setDismissed(true)}
      aria-label="Message PraecisAI on WhatsApp"
      className="fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2.5 rounded-full bg-[#25D366] py-3 pl-3 pr-3 font-body text-[14px] font-semibold text-white shadow-[0_6px_24px_rgba(37,211,102,0.35)] transition-all duration-300 hover:bg-[#1EBE5A] sm:bottom-7 sm:right-7"
      style={{ paddingRight: nudge && !dismissed ? '1.15rem' : undefined }}
    >
      <IconBrandWhatsapp size={24} stroke={2} className="shrink-0" />
      <span
        className="overflow-hidden whitespace-nowrap transition-all duration-300"
        style={{
          maxWidth: nudge && !dismissed ? '11rem' : '0rem',
          opacity: nudge && !dismissed ? 1 : 0,
        }}
      >
        Questions? Message us
      </span>
    </a>
  );
}
