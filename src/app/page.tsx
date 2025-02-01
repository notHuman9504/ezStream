"use client"
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import HeroSection from './components/sections/HeroSection';
import Footer from './components/layout/Footer';
import FeatureSection from './components/sections/FeatureSection';
import CTASection from './components/sections/CTASection';
import HowItWorksSection from './components/sections/HowItWorksSection';

export default function Home() {
  return (
    
      <div className="flex flex-col min-h-screen">
    
        <main className="flex-1">
          <HeroSection />
          <FeatureSection />
          <HowItWorksSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    
  )
}
