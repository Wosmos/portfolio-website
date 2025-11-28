import dynamic from 'next/dynamic';
import CosmicBackground from '@/components/layout/CosmicBackground';
import Dock from '@/components/layout/Dock';
import Hero from '@/components/sections/Hero';
import TechMarquee from '@/components/sections/TechMarquee';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Lazy load components for better performance
const About = dynamic(() => import('@/components/sections/About'), {
  loading: () => <div className="h-screen animate-pulse bg-cosmic-surface/20" />
});
const Experience = dynamic(() => import('@/components/sections/Experience'));
const Projects = dynamic(() => import('@/components/sections/Projects'));
const Blog = dynamic(() => import('@/components/sections/Blog'));
const Contact = dynamic(() => import('@/components/sections/Contact'));
const Footer = dynamic(() => import('@/components/layout/Footer'));

export default function Home() {
  return (
    <main className="relative min-h-screen cosmic-grid">
      <LoadingScreen/>
      <PerformanceMonitor />
      {/* <CosmicBackground /> */}
      
      {/* Optimized Cosmic Orbs */}
      <div 
        className="cosmic-orb w-96 h-96 pointer-events-none" 
        style={{ 
          background: 'var(--cosmic-primary)', 
          top: '10%', 
          right: '-10%',
          willChange: 'transform'
        }}
      />
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
