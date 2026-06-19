'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SplashScreen from './components/SplashScreen';
import Navbar from './components/landing/Navbar';
import HeroSection from './components/landing/HeroSection';
import HowItWorks from './components/landing/HowItWorks';
import FeaturesSection from './components/landing/FeaturesSection';
import ReportsSection from './components/landing/ReportsSection';
import StatsSection from './components/landing/StatsSection';
import PricingSection from './components/landing/PricingSection';
import TestimonialsSection from './components/landing/TestimonialsSection';
import FounderSection from './components/landing/FounderSection';
import FaqSection from './components/landing/FaqSection';
import CtaSection from './components/landing/CtaSection';
import Footer from './components/landing/Footer';

let sessionStarted = false;

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (sessionStarted) {
      setShowSplash(false);
    } else {
      sessionStarted = true;
    }
  }, []);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
      ) : (
        <motion.main
          key="landing"
          className="landing-page min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Navbar />
          <HeroSection />
          <HowItWorks />
          <FeaturesSection />
          <ReportsSection />
          <StatsSection />
          <PricingSection />
          <TestimonialsSection />
          <FounderSection />
          <FaqSection />
          <CtaSection />
          <Footer />
        </motion.main>
      )}
    </AnimatePresence>
  );
}
