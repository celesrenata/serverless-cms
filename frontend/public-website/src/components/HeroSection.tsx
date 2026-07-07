import { Button } from './ui';
import './HeroSection.css';

export function HeroSection() {
  const scrollToArchitecture = () => {
    const section = document.getElementById('architecture');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.hash = 'architecture';
    }
  };

  return (
    <section className="relative flex min-h-screen overflow-hidden bg-theme-background text-theme-text">
      <div className="hero-grid-pattern" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 py-24 text-center sm:px-8 lg:px-12">
        <p className="mb-4 rounded-full border border-theme-primary/20 bg-theme-primary/10 px-4 py-2 text-sm font-medium tracking-wide text-theme-text-muted sm:text-base">
          Elite Serverless Engineering
        </p>

        <h1 className="max-w-5xl text-5xl font-bold tracking-tight text-theme-text sm:text-6xl md:text-7xl lg:text-8xl">
          Celestium
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-theme-text-muted sm:text-lg md:text-xl">
          Designing resilient, scalable, and cost-efficient cloud architectures
          for modern serverless platforms.
        </p>

        <div className="mt-10">
          <Button
            size="lg"
            onClick={scrollToArchitecture}
          >
            Explore Architecture
          </Button>
        </div>
      </div>
    </section>
  );
}
