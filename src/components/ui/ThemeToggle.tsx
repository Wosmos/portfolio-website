'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const moonRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (theme === 'dark') {
      gsap.to(moonRef.current, {
        scale: 1,
        rotate: 0,
        opacity: 1,
        duration: 0.3,
        ease: "back.out(1.7)"
      });
      gsap.to(sunRef.current, {
        scale: 0,
        rotate: -180,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in"
      });
    } else {
      gsap.to(sunRef.current, {
        scale: 1,
        rotate: 0,
        opacity: 1,
        duration: 0.3,
        ease: "back.out(1.7)"
      });
      gsap.to(moonRef.current, {
        scale: 0,
        rotate: 180,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in"
      });
    }
  }, [theme]);

  const handleMouseEnter = () => {
    gsap.to(buttonRef.current, {
      scale: 1.05,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleMouseLeave = () => {
    gsap.to(buttonRef.current, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleClick = () => {
    gsap.to(buttonRef.current, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut"
    });
    toggleTheme();
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative p-3 rounded-full glass-panel hover:bg-cosmic-primary/10 transition-all group"
      aria-label="Toggle theme"
    >
      <div className="relative w-6 h-6">
        <div
          ref={moonRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: theme === 'dark' ? 1 : 0 }}
        >
          <Moon className="w-6 h-6 text-cyan-400" />
        </div>
        <div
          ref={sunRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: theme === 'light' ? 1 : 0 }}
        >
          <Sun className="w-6 h-6 text-amber-500" />
        </div>
      </div>
      
      {/* Tooltip */}
      <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-cosmic-panel text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  );
}
