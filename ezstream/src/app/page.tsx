import IntroSection from './components/sections/IntroSection';
import CapabilitiesSection from './components/sections/CapabilitiesSection';
import StatementSection from './components/sections/StatementSection';
import HowItWorksSection from './components/sections/HowItWorksSection';
import FaqSection from './components/sections/FaqSection';
import ClosingSection from './components/sections/ClosingSection';
import Footer from './components/layout/Footer';
import GoLiveBadge from './components/sections/GoLiveBadge';

// Transparent root so the body's grid shows through every section.
export default function Home() {
  return (
    <>
      <main>
        <IntroSection />
        <CapabilitiesSection />
        <StatementSection />
        <HowItWorksSection />
        <FaqSection />
        <ClosingSection />
      </main>
      <Footer />
      <GoLiveBadge />
    </>
  );
}
