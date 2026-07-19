import type { Metadata } from 'next';
import { Sora, Inter, Geist } from 'next/font/google';
import { GoogleTagManager } from '@next/third-parties/google';
import './globals.css';
import { Providers } from './providers';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PraecisAI: AI-Powered Accounts Receivable',
  description:
    'Enterprise-grade accounts receivable recovery and collections management platform powered by AI.',
  keywords: [
    'accounts receivable',
    'collections management',
    'AR recovery',
    'invoice management',
    'debt recovery',
  ],
  authors: [{ name: 'PraecisAI' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(sora.variable, inter.variable, "font-sans", geist.variable)}>
      <body className={cn(inter.className, 'bg-[var(--cream)]')}>
        <GoogleTagManager gtmId="GTM-MJ2RJX2F" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
