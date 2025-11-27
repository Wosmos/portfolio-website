'use client';

import { useEffect } from 'react';

// Type definitions for Performance Entry types
interface PerformanceEntryWithProcessing extends PerformanceEntry {
  processingStart: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

const PerformanceMonitor = () => {
  useEffect(() => {
    // Only run in development or if explicitly enabled
    if (process.env.NODE_ENV !== 'development') return;
    
    // Monitor Core Web Vitals
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observers: PerformanceObserver[] = [];

      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            console.log('LCP:', Math.round(lastEntry.startTime), 'ms');
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observers.push(lcpObserver);
      } catch {
        // Browser doesn't support this metric
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as PerformanceEntryWithProcessing;
            if (fidEntry.processingStart) {
              console.log('FID:', Math.round(fidEntry.processingStart - fidEntry.startTime), 'ms');
            }
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        observers.push(fidObserver);
      } catch {
        // Browser doesn't support this metric
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutEntry = entry as LayoutShiftEntry;
            if (!layoutEntry.hadRecentInput && layoutEntry.value) {
              clsValue += layoutEntry.value;
            }
          }
          console.log('CLS:', clsValue.toFixed(4));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observers.push(clsObserver);
      } catch {
        // Browser doesn't support this metric
      }

      return () => {
        observers.forEach(observer => observer.disconnect());
      };
    }
  }, []);

  return null;
};

export default PerformanceMonitor;