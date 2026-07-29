'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '../../../lib/supabase/client';
// import { AnimatePresence } from 'framer-motion';
// import WorkflowSplash from '../splash/WorkflowSplash';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import TwoWaysSection from './TwoWaysSection';
import HowItWorks from './HowItWorks';
import DifferentiatorSection from './DifferentiatorSection';
import IndustriesStrip from './IndustriesStrip';
import FeaturesSection from './FeaturesSection';
import BentoSection from './BentoSection';
import CapabilitiesSection from './CapabilitiesSection';
import ReportsSection from './ReportsSection';
import StatsSection from './StatsSection';
import PricingSection from './PricingSection';
import TestimonialsSection from './TestimonialsSection';
import FounderSection from './FounderSection';
import FaqSection from './FaqSection';
import CtaSection from './CtaSection';
import Footer from './Footer';
import CardSpotlight from '../CardSpotlight';
import WhatsAppWidget from '../marketing/WhatsAppWidget';

// let sessionStarted = false;

export default function LandingPage() {
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
    </motion.main>
  );
}
