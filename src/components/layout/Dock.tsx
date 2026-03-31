'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { Home, User, Code, Briefcase, BookOpen, Github, Linkedin, Mail } from 'lucide-react';

const DOCK_ITEMS = [
  { href: '#home', icon: Home, label: 'HOME', isExternal: false },
  { href: '#about', icon: User, label: 'ABOUT', isExternal: false },
  { href: '#projects', icon: Code, label: 'PROJECTS', isExternal: false },
  { href: '#experience', icon: Briefcase, label: 'EXPERIENCE', isExternal: false },
  { href: '#blog', icon: BookOpen, label: 'BLOG', isExternal: false },
  { type: 'separator' as const },
  { href: 'https://github.com/Wosmos', icon: Github, label: 'GITHUB', isExternal: true },
  { href: 'https://www.linkedin.com/in/wasif-m-79205a1bb/', icon: Linkedin, label: 'LINKEDIN', isExternal: true },
  { href: '#contact', icon: Mail, label: 'CONTACT', isExternal: false, isAccent: true },
] as const;

const Dock = () => {
  const dockRef = useRef<HTMLDivElement>(null);

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
    <nav className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50">
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
          <Link href="#contact" className="dock-item-mobile text-cosmic-primary">
            <Mail className="w-5 h-5" />
            <span className="text-[10px] mt-1">Contact</span>
          </Link>
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

          const { href, icon: Icon, label, isExternal, isAccent } = item as {
            href: string; icon: typeof Home; label: string; isExternal: boolean; isAccent?: boolean;
          };

          const className = `dock-icon relative flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-[transform] duration-150 ease-out cursor-pointer group ${
            isAccent
              ? 'bg-cosmic-primary text-cosmic-void hover:shadow-[0_0_20px_rgba(0,212,255,0.5)]'
              : 'hover:bg-white/10'
          }`;

          const inner = (
            <>
              <Icon className="w-5 h-5" />
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
