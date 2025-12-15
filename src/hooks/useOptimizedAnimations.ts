'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const useOptimizedAnimations = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Set GSAP defaults for better performance
    gsap.defaults({
      ease: "power2.out",
      duration: 0.8
    });

    // Configure ScrollTrigger for better performance
    ScrollTrigger.config({
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
      ignoreMobileResize: true
    });

    // Batch scroll animations for better performance
    ScrollTrigger.batch(".animate-on-scroll", {
      onEnter: (elements) => {
        gsap.from(elements, {
          y: 50,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out"
        });
      },
      start: "top 85%",
      once: true
    });

    // Optimized parallax for cosmic orbs
    const orbs = document.querySelectorAll('.cosmic-orb');
    if (orbs.length > 0) {
      gsap.to(orbs, {
        yPercent: -50,
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top bottom",
          end: "bottom top",
          scrub: 1
        }
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return {
    fadeInUp: (element: string | Element, delay = 0) => {
      gsap.from(element, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        delay,
        ease: "power2.out"
      });
    },
    
    staggerFadeIn: (elements: string | Element[], stagger = 0.1) => {
      gsap.from(elements, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger,
        ease: "power2.out"
      });
    },

    scaleIn: (element: string | Element, delay = 0) => {
      gsap.from(element, {
        scale: 0.8,
        opacity: 0,
        duration: 0.5,
        delay,
        ease: "back.out(1.7)"
      });
    }
  };
};