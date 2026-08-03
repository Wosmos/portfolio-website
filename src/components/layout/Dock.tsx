'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, User, Code, Briefcase, BookOpen, Github, Linkedin, Mail } from 'lucide-react';

const NAV_SECTIONS = ['home', 'about', 'projects', 'experience', 'blog', 'contact'];

const DOCK_ITEMS = [
  { href: '#home', icon: Home, label: 'HOME', isExternal: false, section: 'home' },
  { href: '#about', icon: User, label: 'ABOUT', isExternal: false, section: 'about' },
  { href: '#experience', icon: Briefcase, label: 'EXPERIENCE', isExternal: false, section: 'experience' },
  { href: '#projects', icon: Code, label: 'PROJECTS', isExternal: false, section: 'projects' },
  { href: '#blog', icon: BookOpen, label: 'BLOG', isExternal: false, section: 'blog' },
  { type: 'separator' as const },
  { href: 'https://github.com/Wosmos', icon: Github, label: 'GITHUB', isExternal: true },
  { href: 'https//:www.linkedin.com/in/wasif-malik-79205a1bb', icon: Linkedin, label: 'LINKEDIN', isExternal: true },
  { href: '#contact', icon: Mail, label: 'CONTACT', isExternal: false, isAccent: true, section: 'contact' },
] as const;

const Dock = () => {
  const dockRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('home');

  // Track which section is in view — uses MutationObserver to catch lazy-loaded sections
  useEffect(() => {
    const sectionObservers = new Map<string, IntersectionObserver>();

    const observeSection = (id: string) => {
      if (sectionObservers.has(id)) return;
      const el = document.getElementById(id);
      if (!el) return;

      const io = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-30% 0px -65% 0px' }
      );
      io.observe(el);
      sectionObservers.set(id, io);
    };

    // Observe any sections already in DOM
    NAV_SECTIONS.forEach(observeSection);

    // Watch for dynamically loaded sections
    const mo = new MutationObserver(() => {
      NAV_SECTIONS.forEach(observeSection);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      sectionObservers.forEach((io) => io.disconnect());
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const dock = dockRef.current;
    if (!dock) return;
    const items = dock.querySelectorAll<HTMLElement>('.dock-icon');
    const mouseX = e.clientX;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const itemCenterX = rect.left + rect.width / 2;
      const distance = Math.abs(mouseX - itemCenterX);
      const maxDist = 150;
      const scale = Math.max(1, 1.5 - (distance / maxDist) * 0.5);
      const translateY = -(scale - 1) * 20;

      item.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const items = dock.querySelectorAll<HTMLElement>('.dock-icon');
    items.forEach((item) => {
      item.style.transform = 'scale(1) translateY(0)';
    });
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 backdrop-blur-xs">
      {/* Mobile: Full width bottom bar */}
      <div className="md:hidden w-full bg-[rgba(30,30,60,0.65)] backdrop-blur-[120px] saturate-[2.2] brightness-[1.2] border-t border-white/[0.08] px-2 py-2 safe-area-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {[
            { href: '#home', icon: Home, label: 'Home', section: 'home' },
            { href: '#about', icon: User, label: 'About', section: 'about' },
            { href: '#projects', icon: Code, label: 'Work', section: 'projects' },
            { href: '#experience', icon: Briefcase, label: 'Exp', section: 'experience' },
            { href: '#contact', icon: Mail, label: 'Contact', section: 'contact' },
          ].map(({ href, icon: Icon, label, section }) => (
            <Link
              key={section}
              href={href}
              className={`dock-item-mobile ${activeSection === section ? 'text-cosmic-primary' : ''}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: macOS-style dock */}
      <div
        ref={dockRef}
        className="hidden md:flex macos-dock items-end gap-1 px-3 pb-2 pt-2"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {DOCK_ITEMS.map((item, idx) => {
          if ('type' in item && item.type === 'separator') {
            return <div key={`sep-${idx}`} className="dock-divider mx-1" />;
          }

          const { href, icon: Icon, label, isExternal } = item as {
            href: string; icon: typeof Home; label: string; isExternal: boolean; isAccent?: boolean; section?: string;
          };
          const section = 'section' in item ? (item as { section?: string }).section : undefined;
          const isAccent = 'isAccent' in item && (item as { isAccent?: boolean }).isAccent;
          const isActive = section ? activeSection === section : false;

          const className = `dock-icon relative flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-[transform,background,box-shadow] duration-150 ease-out cursor-pointer group border  border-white/15 shadow-sm ${
            isAccent
              ? 'bg-cosmic-primary text-cosmic-void hover:shadow-[0_0_20px_rgba(0,212,255,0.5)]'
              : isActive
                ? 'bg-white/15 text-cosmic-primary shadow-[0_0_12px_rgba(0,212,255,0.25)]'
                : 'hover:bg-white/10'
          }`;

          const inner = (
            <>
              <Icon className="w-5 h-5" />
              {/* Active dot indicator */}
              {isActive && !isAccent && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cosmic-primary" />
              )}
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-cosmic-panel/95 backdrop-blur-sm text-[10px] font-mono text-cosmic-text rounded-md border border-cosmic-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
                {label}
              </span>
            </>
          );

          if (isExternal) {
            return (
              <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className={className}>
                {inner}
              </a>
            );
          }

          return (
            <Link key={idx} href={href} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Dock;
