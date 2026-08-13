import Dock from '@/components/layout/Dock';
import Hero from '@/components/sections/Hero';
import TechMarquee from '@/components/sections/TechMarquee';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import About from '@/components/sections/About';
import Experience from '@/components/sections/Experience';
import Projects from '@/components/sections/Projects';
import Blog from '@/components/sections/Blog';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/layout/Footer';

export default function Home() {
  return (
    <main className="relative min-h-screen cosmic-grid">
      <PerformanceMonitor />

      {/* Cosmic Orbs — decorative, animated via CSS. No permanent will-change,
          so the compositor isn't forced to hold idle GPU layers. */}
      <div
        className="cosmic-orb w-64 h-64 pointer-events-none"
        style={{
          background: 'var(--cosmic-secondary)',
          bottom: '20%',
          left: '-5%',
          animationDelay: '-3s',
        }}
      />
      <div
        className="cosmic-orb w-48 h-48 pointer-events-none"
        style={{
          background: 'var(--cosmic-accent)',
          top: '50%',
          left: '30%',
          animationDelay: '-1.5s',
        }}
      />

      <Dock />
      <Hero />
      <TechMarquee />
      <About />
      <Experience />
      <Projects />
      <Blog />
      <Contact />
      <Footer />
    </main>
  );
}
