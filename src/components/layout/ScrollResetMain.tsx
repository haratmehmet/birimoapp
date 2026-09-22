'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollResetMain({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Disable automatic browser scroll restoration to prevent layout jumping
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const resetAllScrolls = () => {
      // 1. Reset window and document level scrolls
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }

      // 2. Reset the main container
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
        mainRef.current.scrollLeft = 0;
      }

      // 3. Reset any parent elements that might have scrolled programmatically
      let el: HTMLElement | null = mainRef.current?.parentElement || null;
      while (el && el !== document.body) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
        el = el.parentElement;
      }
    };

    // Run immediately
    resetAllScrolls();

    // Run on next frame and after brief timeouts to override any Next.js router scroll behavior
    const rAF = requestAnimationFrame(resetAllScrolls);
    const t1 = setTimeout(resetAllScrolls, 50);
    const t2 = setTimeout(resetAllScrolls, 150);

    return () => {
      cancelAnimationFrame(rAF);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  return (
    <main ref={mainRef} className={className}>
      {children}
    </main>
  );
}
