"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function NavigationLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 z-[9999] animate-pulse">
      <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent animate-[shimmer_1s_ease-in-out_infinite]" />
    </div>
  );
}

// For manual triggering from outside
let setGlobalLoading: ((loading: boolean) => void) | null = null;

export function useNavigationLoading() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setGlobalLoading = setIsLoading;
    return () => {
      setGlobalLoading = null;
    };
  }, []);

  return isLoading;
}

export function startNavigationLoading() {
  if (setGlobalLoading) {
    setGlobalLoading(true);
  }
}

export function stopNavigationLoading() {
  if (setGlobalLoading) {
    setGlobalLoading(false);
  }
}
