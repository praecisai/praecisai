import type { Metadata } from 'next';
import LandingPage from './components/landing/LandingPage';

export const metadata: Metadata = {
  title: { absolute: 'AI Calling Agent for Payment Recovery | PraecisAI' },
  description:
    'An AI collections agent that calls and WhatsApps your B2B customers to recover outstanding payments. Built for Indian MSMEs. Live in 10 minutes.',
  alternates: { canonical: '/' },
};

export default function Home() {
  return <LandingPage />;
}
