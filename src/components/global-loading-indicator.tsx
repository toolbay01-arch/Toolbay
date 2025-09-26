'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  
  const isLoading = isFetching > 0 || isMutating > 0;

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-blue-500 animate-pulse">
        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 animate-[loading_2s_ease-in-out_infinite]" />
      </div>
      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
