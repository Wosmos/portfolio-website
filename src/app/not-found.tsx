'use client';

import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Home } from 'lucide-react';

export default function NotFound() {
  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo('.not-found-code', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.8 })
      .fromTo('.not-found-text', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
      .fromTo('.not-found-btn', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.2');

    gsap.to('.orb-1', { y: -30, x: 15, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('.orb-2', { y: 20, x: -20, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('.orb-3', { y: -15, x: -10, duration: 3.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--cosmic-dark)', fontFamily: 'var(--font-body)' }}
    >
      {/* Floating orbs */}
      <div className="orb-1 absolute top-[15%] left-[10%] w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="orb-2 absolute bottom-[10%] right-[10%] w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="orb-3 absolute top-[50%] right-[25%] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <h1
          className="not-found-code text-[8rem] md:text-[12rem] font-black leading-none cosmic-glow opacity-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          404
        </h1>

        <div className="not-found-text opacity-0 mt-2 mb-10">
          <p className="text-xl md:text-2xl text-gray-300 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Lost in the cosmos
          </p>
          <p className="text-sm text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist or has drifted away.
          </p>
        </div>

        <Link
          href="/"
          className="not-found-btn opacity-0 inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition-all hover:shadow-2xl hover:shadow-indigo-500/25"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
