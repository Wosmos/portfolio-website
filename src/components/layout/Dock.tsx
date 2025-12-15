'use client';

import Link from 'next/link';
import { Home, User, Code, Briefcase, BookOpen, Github, Linkedin, Mail } from 'lucide-react';

const Dock = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:bottom-8 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50">
      {/* Mobile: Full width bottom bar */}
      <div className="md:hidden w-full bg-cosmic-surface/95 backdrop-blur-xl border-t border-cosmic-border px-2 py-2 safe-area-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <Link href="#home" className="dock-item-mobile">
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-1">Home</span>
          </Link>
          <Link href="#about" className="dock-item-mobile">
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-1">About</span>
          </Link>
          <Link href="#projects" className="dock-item-mobile">
            <Code className="w-5 h-5" />
            <span className="text-[10px] mt-1">Work</span>
          </Link>
          <Link href="#experience" className="dock-item-mobile">
            <Briefcase className="w-5 h-5" />
            <span className="text-[10px] mt-1">Exp</span>
          </Link>
          <Link 
            href="#contact" 
            className="dock-item-mobile text-cosmic-primary"
          >
            <Mail className="w-5 h-5" />
            <span className="text-[10px] mt-1">Contact</span>
          </Link>
        </div>
      </div>

      {/* Desktop: Floating dock */}
      <div className="hidden md:flex dock-container items-center gap-2">
        <Link href="#home" className="dock-item" data-tooltip="HOME">
          <Home className="w-5 h-5" />
        </Link>
        <Link href="#about" className="dock-item" data-tooltip="ABOUT">
          <User className="w-5 h-5" />
        </Link>
        <Link href="#projects" className="dock-item" data-tooltip="PROJECTS">
          <Code className="w-5 h-5" />
        </Link>
        <Link href="#experience" className="dock-item" data-tooltip="EXPERIENCE">
          <Briefcase className="w-5 h-5" />
        </Link>
        <Link href="#blog" className="dock-item" data-tooltip="BLOG">
          <BookOpen className="w-5 h-5" />
        </Link>
        <div className="dock-separator"></div>
        <a href="https://github.com/Wosmos" target="_blank" rel="noopener noreferrer" className="dock-item" data-tooltip="GITHUB">
          <Github className="w-5 h-5" />
        </a>
        <a href="https://www.linkedin.com/in/wasif-m-79205a1bb/" target="_blank" rel="noopener noreferrer" className="dock-item" data-tooltip="LINKEDIN">
          <Linkedin className="w-5 h-5" />
        </a>
        <Link href="#contact" className="dock-item" data-tooltip="CONTACT" style={{ background: 'var(--cosmic-primary)', color: 'var(--cosmic-void)' }}>
          <Mail className="w-5 h-5" />
        </Link>
      </div>
    </nav>
  );
};

export default Dock;
