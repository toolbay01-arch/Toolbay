"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Prefetches a route when the user hovers over a link
 * This significantly reduces navigation delays on first click
 */
export function usePrefetchOnHover(href: string | undefined) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (!href) return;
    
    // Delay prefetch slightly to avoid prefetching on quick mouse movements
    timeoutRef.current = setTimeout(() => {
      router.prefetch(href);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { handleMouseEnter, handleMouseLeave };
}
