import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[rgba(127,85,57,0.15)] bg-[var(--surface-warm)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-[var(--dark-brown)]"
          >
            Praecis<span className="text-[var(--rust)]">AI</span>
          </Link>
          <Link
            href="/"
            className="font-body text-[13px] text-[var(--mahogany)] transition-colors hover:text-[var(--rust)]"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="legal-prose mx-auto max-w-3xl px-5 py-12 sm:px-8">{children}</main>

      <footer className="border-t border-[rgba(127,85,57,0.15)] py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="font-body text-[12px] text-[var(--walnut)] transition-colors hover:text-[var(--mahogany)]"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="font-body text-[12px] text-[var(--walnut)] transition-colors hover:text-[var(--mahogany)]"
            >
              Terms of Service
            </Link>
          </div>
          <p className="font-body text-[12px] text-[var(--walnut)]">
            © 2026 Praecis AI · All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
