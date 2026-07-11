'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '../lib/supabase/client';
// import { AnimatePresence } from 'framer-motion';
// import WorkflowSplash from './components/splash/WorkflowSplash';
import Navbar from './components/landing/Navbar';
import HeroSection from './components/landing/HeroSection';
import HowItWorks from './components/landing/HowItWorks';
import FeaturesSection from './components/landing/FeaturesSection';
import BentoSection from './components/landing/BentoSection';
import CapabilitiesSection from './components/landing/CapabilitiesSection';
import ReportsSection from './components/landing/ReportsSection';
import StatsSection from './components/landing/StatsSection';
import PricingSection from './components/landing/PricingSection';
import TestimonialsSection from './components/landing/TestimonialsSection';
import FounderSection from './components/landing/FounderSection';
import FaqSection from './components/landing/FaqSection';
import CtaSection from './components/landing/CtaSection';
import Footer from './components/landing/Footer';
import CardSpotlight from './components/CardSpotlight';

// let sessionStarted = false;

export default function Home() {
  const router = useRouter();

  // Fallback: if OAuth code lands on homepage instead of /auth/callback, exchange it here
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!error) router.replace('/dashboard');
    });
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
    <motion.main
      className="landing-page min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <CardSpotlight />
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <FeaturesSection />
      <BentoSection />
      <ReportsSection />
      <CapabilitiesSection />
      <StatsSection />
      <PricingSection />
      <TestimonialsSection />
      <FounderSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </motion.main>
  );
}
