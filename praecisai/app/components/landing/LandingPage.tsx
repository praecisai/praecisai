'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
// import { AnimatePresence } from 'framer-motion';
// import WorkflowSplash from '../splash/WorkflowSplash';
import Navbar from './Navbar';
import HeroSection from './HeroSection';

// Everything below the fold is code-split so the first paint only ships the
// navbar + hero. `ssr` stays on (the default), so the HTML is still fully
// server-rendered and SEO/crawlers see the complete page: only the hydration
// JS moves into separate chunks that load after the hero.
const TwoWaysSection = dynamic(() => import('./TwoWaysSection'));
const HowItWorks = dynamic(() => import('./HowItWorks'));
const DifferentiatorSection = dynamic(() => import('./DifferentiatorSection'));
const IndustriesStrip = dynamic(() => import('./IndustriesStrip'));
const FeaturesSection = dynamic(() => import('./FeaturesSection'));
const BentoSection = dynamic(() => import('./BentoSection'));
const CapabilitiesSection = dynamic(() => import('./CapabilitiesSection'));
const ReportsSection = dynamic(() => import('./ReportsSection'));
const StatsSection = dynamic(() => import('./StatsSection'));
const PricingSection = dynamic(() => import('./PricingSection'));
const TestimonialsSection = dynamic(() => import('./TestimonialsSection'));
const FounderSection = dynamic(() => import('./FounderSection'));
const FaqSection = dynamic(() => import('./FaqSection'));
const CtaSection = dynamic(() => import('./CtaSection'));
const Footer = dynamic(() => import('./Footer'));
// Decorative/interactive only: no SSR value, so keep them out of the
// server render and the critical path entirely.
const CardSpotlight = dynamic(() => import('../CardSpotlight'), { ssr: false });
const WhatsAppWidget = dynamic(() => import('../marketing/WhatsAppWidget'), { ssr: false });

// let sessionStarted = false;

export default function LandingPage() {
  const router = useRouter();

  // Fallback: if an OAuth code lands on the homepage instead of /auth/callback,
  // exchange it here. The Supabase client (~240 KB) is imported ONLY in that
  // rare case, so ordinary visitors never download it with the landing page.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;
    let cancelled = false;
    import('../../../lib/supabase/client').then(({ createClient }) => {
      if (cancelled) return;
      createClient()
        .auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (!error && !cancelled) router.replace('/dashboard');
        });
    });
    return () => { cancelled = true; };
  }, [router]);
  // ── Splash temporarily disabled — uncomment below to re-enable ──
  // const [showSplash, setShowSplash] = useState(() => !sessionStarted);
  // useEffect(() => { if (!sessionStarted) sessionStarted = true; }, []);
  // return (
  //   <AnimatePresence mode="wait">
  //     {showSplash ? (
  //       <WorkflowSplash key="splash" onComplete={() => setShowSplash(false)} />
  //     ) : (
  //       <motion.main key="landing" className="landing-page min-h-screen"
  //         initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
  //         ... sections ...
  //       </motion.main>
  //     )}
  //   </AnimatePresence>
  // );

  return (
    <main className="landing-page min-h-screen">
      <CardSpotlight />
      <Navbar />
      <HeroSection />
      <TwoWaysSection />
      <HowItWorks />
      <IndustriesStrip />
      <DifferentiatorSection />
      <FeaturesSection />
      <BentoSection />
      <CapabilitiesSection />
      <ReportsSection />
      <StatsSection />
      <TestimonialsSection />
      <PricingSection />
      <FounderSection />
      <FaqSection />
      <CtaSection />
      <Footer />
      <WhatsAppWidget />
    </main>
  );
}
