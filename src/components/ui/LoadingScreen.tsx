'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial animations
    const tl = gsap.timeline();
    
    tl.from(logoRef.current, {
      scale: 0.5,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    })
    .from(textRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.3")
    .from(progressContainerRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.6,
      ease: "back.out(1.7)"
    }, "-=0.3");

    // Continuous animations
    gsap.to(glowRef.current, {
      rotation: 360,
      duration: 8,
      repeat: -1,
      ease: "none"
    });

    gsap.to(glowRef.current, {
      scale: 1.1,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    gsap.to(logoRef.current, {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    gsap.to(scanLineRef.current, {
      y: '200%',
      duration: 2,
      repeat: -1,
      ease: "none"
    });

    gsap.to(shimmerRef.current, {
      x: '200%',
      duration: 1.5,
      repeat: -1,
      ease: "none"
    });

    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            gsap.to(containerRef.current, {
              opacity: 0,
              duration: 0.5,
              onComplete: () => setIsLoading(false)
            });
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        width: `${progress}%`,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  }, [progress]);

  if (!isLoading) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-cosmic-void"
    >
      {/* Animated Background Grid */}
      <div className="absolute inset-0 cosmic-grid opacity-30" />
      
      {/* Glowing Orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo Container with Glow Effect */}
        <div className="relative">
          {/* Outer Glow Ring */}
          <div
            ref={glowRef}
            className="absolute rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 blur-2xl opacity-50"
            style={{ width: '200px', height: '200px', left: '-25px', top: '-25px' }}
          />
          
          {/* Logo */}
          <div
            ref={logoRef}
            className="relative w-[150px] h-[150px] rounded-full bg-cosmic-surface border-2 border-cyan-400/30 flex items-center justify-center overflow-hidden"
          >
            <Image
              src="/logo.png"
              alt="Wosmo Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
            
            {/* Scanning Line Effect */}
            <div
              ref={scanLineRef}
              className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent"
              style={{ height: '30%', top: '-100%' }}
            />
          </div>
        </div>

        {/* Loading Text */}
        <div ref={textRef} className="text-center">
          <h2 className="text-3xl font-bold mb-2 cosmic-glow" style={{ fontFamily: 'var(--font-display)' }}>
            INITIALIZING
          </h2>
          <p className="text-gray-400 font-mono text-sm">
            Loading cosmic experience...
          </p>
        </div>

        {/* Progress Bar */}
        <div ref={progressContainerRef} className="w-64">
          <div className="relative h-2 bg-cosmic-surface rounded-full overflow-hidden border border-cyan-400/20">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 rounded-full relative"
              style={{ width: '0%' }}
            >
              {/* Shimmer Effect */}
              <div
                ref={shimmerRef}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={{ transform: 'translateX(-100%)' }}
              />
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className="text-cyan-400 font-mono text-sm">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
