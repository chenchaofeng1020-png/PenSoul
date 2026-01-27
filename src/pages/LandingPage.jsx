import React, { useEffect } from 'react';
import { Navbar, HeroSection, FeatureSection, Footer } from '../components/landing/LandingComponents';

const LandingPage = ({ onLoginClick }) => {
  useEffect(() => {
    document.title = 'Product Duck - 构建不仅好用，而且好卖的产品';
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar onLoginClick={onLoginClick} />
      <main>
        <HeroSection onLoginClick={onLoginClick} />
        <FeatureSection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
