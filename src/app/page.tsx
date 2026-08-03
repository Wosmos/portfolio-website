import Dock from '@/components/layout/Dock';
import Hero from '@/components/sections/Hero';
import TechMarquee from '@/components/sections/TechMarquee';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import LoadingScreen from '@/components/ui/LoadingScreen';
import About from '@/components/sections/About';
import Experience from '@/components/sections/Experience';
import Projects from '@/components/sections/Projects';
import Blog from '@/components/sections/Blog';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/layout/Footer';

export default function Home() {
  return (
    <main className="relative min-h-screen cosmic-grid">
      <LoadingScreen/>
      <PerformanceMonitor />
      {/* <CosmicBackground /> */}
      
      {/* Optimized Cosmic Orbs */}
      {/* <div 
        className="cosmic-orb xl:block hidden w-96 h-96 pointer-events-none" 
        style={{ 
          background: 'var(--cosmic-primary)', 
          top: '10%', 
          right: '-10%',
          willChange: 'transform'
        }}
      /> */}
      <div 
        className="cosmic-orb w-64 h-64 pointer-events-none" 
        style={{ 
          background: 'var(--cosmic-secondary)', 
          bottom: '20%', 
          left: '-5%', 
          animationDelay: '-3s',
          willChange: 'transform'
        }}
      />
      <div 
        className="cosmic-orb w-48 h-48 pointer-events-none" 
        style={{ 
          background: 'var(--cosmic-accent)', 
          top: '50%', 
          left: '30%', 
          animationDelay: '-1.5s',
          willChange: 'transform'
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
