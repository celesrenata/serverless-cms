import { lazy, Suspense } from 'react';
import { PageMeta } from '../components/PageMeta';
import { HeroSection } from '../components/HeroSection';
import { CapabilityCards } from '../components/CapabilityCards';
import { ProjectsSection } from '../components/ProjectsSection';
import { ContactSection } from '../components/ContactSection';

// Lazy-loaded below-fold content (Req 13.3)
const ArchitectureMapSection = lazy(() =>
  import('../components/ArchitectureMap/ArchitectureMapSection')
);

export const Home = () => {
  return (
    <div className="min-h-screen bg-theme-background">
      <PageMeta
        title="Home"
        description="Elite serverless engineering — architecture, automation, and cloud-native solutions."
      />
      <HeroSection />
      <CapabilityCards />
      <Suspense fallback={<div className="py-16 text-center text-gray-400">Loading architecture map...</div>}>
        <ArchitectureMapSection />
      </Suspense>
      <ProjectsSection />
      <ContactSection />
    </div>
  );
};
