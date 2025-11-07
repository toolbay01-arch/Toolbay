"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Prefetches critical routes on mount to improve navigation performance
 * Add this component to your root layout
 */
export function PrefetchCriticalRoutes() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch most commonly accessed routes
    const criticalRoutes = [
      "/library",
      "/dashboard",
      "/admin",
      // Add more routes that users frequently navigate to
    ];

    // Small delay to not interfere with initial page load
    const timer = setTimeout(() => {
      criticalRoutes.forEach((route) => {
        router.prefetch(route);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return null; // This component doesn't render anything
}
