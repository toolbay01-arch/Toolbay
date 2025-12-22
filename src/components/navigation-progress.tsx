"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Global navigation progress indicator
 * Shows a loading bar at the top of the page during client-side navigation
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Small delay to show progress bar
    setIsNavigating(true);
    
    const timeout = setTimeout(() => {
      setIsNavigating(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [pathname]);

  if (!isNavigating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 via-blue-500 to-pink-400 z-[9999] animate-pulse"
      style={{
        animation: "progress 1s ease-in-out infinite",
      }}
    >
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
