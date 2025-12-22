"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";

import { SearchFilters, SearchFiltersSkeleton } from "./search-filters";

export const ConditionalSearchFilters = () => {
  const pathname = usePathname();
  
  // Don't show search filters on chat pages
  if (pathname?.startsWith('/chat')) {
    return null;
  }
  
  return (
    <Suspense fallback={<SearchFiltersSkeleton />}>
      <SearchFilters />
    </Suspense>
  );
};
