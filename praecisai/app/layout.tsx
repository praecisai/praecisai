import type { Metadata } from 'next';
import { Sora, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { DeferredGTM } from './components/DeferredGTM';
import { cn } from "@/lib/utils";

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

const SITE_URL = 'https://www.praecisai.in';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Praecis AI - AI Calling Agent for Payment Recovery',
    template: '%s | PraecisAI',
  },
  description:
    'An AI collections agent that calls and WhatsApps your B2B customers to recover outstanding payments. Built for Indian MSMEs. Live in 10 minutes.',
  keywords: [
    'AI calling agent for payment collection',
    'AI collections agent India',
    'credit recovery software India',
    'B2B credit recovery agent',
    'payment follow up software',
    'automated payment reminders WhatsApp',
    'accounts receivable software India',
    'AR automation',
    'AI collections for pharma distributors',
    'payment recovery for textile business',
    'debt recovery',
  ],
  authors: [{ name: 'PraecisAI' }],
  creator: 'PraecisAI',
  publisher: 'PraecisAI',
  applicationName: 'PraecisAI',
  category: 'business',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'PraecisAI',
    locale: 'en_IN',
    title: 'AI Calling Agent for Payment Recovery | PraecisAI',
    description:
      'An AI collections agent that calls and WhatsApps your B2B customers to recover outstanding payments. Built for Indian MSMEs. Live in 10 minutes.',
    images: [
      {
        url: '/apple-touch-icon.png',
        width: 180,
        height: 180,
        alt: 'PraecisAI logo: AI calling agent for payment and credit recovery',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'PraecisAI: AI Calling Agent for Payment & Credit Recovery',
    description:
      'AI voice calls, WhatsApp reminders, and promise-to-pay tracking that recover outstanding payments for Indian B2B businesses.',
    images: ['/apple-touch-icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

// ── Site-wide structured data ──────────────────────────────────────────
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PraecisAI',
  url: SITE_URL,
  logo: `${SITE_URL}/apple-touch-icon.png`,
  email: 'hello@praecisai.in',
  description:
    'AI-powered accounts receivable collection agent for B2B businesses in India.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Mumbai',
    addressCountry: 'IN',
  },
  areaServed: { '@type': 'Country', name: 'India' },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'hello@praecisai.in',
      telephone: '+91-7304862949',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
  ],
};

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PraecisAI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  offers: {
    '@type': 'Offer',
    price: '5000',
    priceCurrency: 'INR',
    priceValidUntil: '2027-12-31',
    url: `${SITE_URL}/pricing`,
  },
  description:
    'AI-powered accounts receivable collection agent for B2B businesses in India. Automated Hindi and English voice calls, WhatsApp reminders, and promise-to-pay tracking.',
  provider: {
    '@type': 'Organization',
    name: 'PraecisAI',
    url: SITE_URL,
  },
};

const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'PraecisAI',
  url: SITE_URL,
  inLanguage: 'en-IN',
  publisher: { '@type': 'Organization', name: 'PraecisAI', url: SITE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(sora.variable, inter.variable, "font-sans")}>
      <body className={cn(inter.className, 'bg-[var(--cream)]')}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              organizationJsonLd,
              softwareApplicationJsonLd,
              webSiteJsonLd,
            ]),
          }}
        />
        <DeferredGTM gtmId="GTM-MJ2RJX2F" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
