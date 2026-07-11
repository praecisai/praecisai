'use client';

import Link from 'next/link';
import { IconBrandWhatsapp, IconMail, IconMapPin } from '@tabler/icons-react';
import { Logo } from './Logo';

const productLinks = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features',     href: '#features' },
  { label: 'Reports',      href: '#reports' },
  { label: 'Pricing',      href: '#pricing' },
];

const companyLinks = [
  { label: 'About',          href: '#founder' },
  { label: 'Contact',        href: 'mailto:hello@praecisai.in' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms',          href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-[#0F0A06] px-5 pb-10 pt-16 sm:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Grid */}
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-[1.8fr_1fr_1fr_1fr]">

          {/* Brand column */}
          <div>
            <Logo dark={false} />
            <p className="mt-5 max-w-[260px] font-body text-[14px] leading-[1.75] text-[var(--walnut)]">
              AI-powered accounts receivable recovery for Indian businesses, so you can focus on
              growing, not chasing.
            </p>
            <div className="mt-5 flex items-center gap-2 font-body text-[13px] text-[var(--walnut)]">
              <IconMapPin size={14} stroke={1.75} />
              Mumbai, India · praecisai.in
            </div>
          </div>

          {/* Link columns — 2-col on mobile, individual on lg */}
          <div className="grid grid-cols-2 gap-8 sm:contents">

          {/* Product */}
          <div>
            <h4 className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-[#FDF8F3]">
              Product
            </h4>
            <ul className="mt-5 space-y-3.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-[14px] text-[var(--walnut)] transition-colors hover:text-[#F5EBE0]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-[#FDF8F3]">
              Company
            </h4>
            <ul className="mt-5 space-y-3.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-[14px] text-[var(--walnut)] transition-colors hover:text-[#F5EBE0]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-[#FDF8F3]">
              Contact
            </h4>
            <ul className="mt-5 space-y-3.5">
              <li>
                <a
                  href="mailto:hello@praecisai.in"
                  className="inline-flex items-center gap-2 font-body text-[14px] text-[var(--walnut)] transition-colors hover:text-[#F5EBE0]"
                >
                  <IconMail size={14} stroke={1.75} />
                  hello@praecisai.in
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/917304862949"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-body text-[14px] text-[var(--walnut)] transition-colors hover:text-[#F5EBE0]"
                >
                  <IconBrandWhatsapp size={14} stroke={1.75} />
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[rgba(176,137,104,0.15)] pt-6 sm:flex-row">
          <p className="font-body text-[12px] text-[var(--walnut)]">
            © 2026 Praecis AI · Built with ❤️ for Indian businesses
          </p>
          <p className="font-body text-[12px] text-[var(--walnut)]">
            All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
