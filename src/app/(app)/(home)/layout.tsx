import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getQueryClient, trpc } from "@/trpc/server";

import { Footer } from "@/modules/home/ui/components/footer";
import { SearchFilters, SearchFiltersSkeleton } from "@/modules/home/ui/components/search-filters";

interface Props {
  children: React.ReactNode;
};

const Layout = async ({ children }: Props) => {
  const queryClient = getQueryClient();
  
  // Prefetch categories with proper error handling
  try {
    await queryClient.prefetchQuery({
      ...trpc.categories.getMany.queryOptions(),
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    });
  } catch (error) {
    console.error('Failed to prefetch categories:', error);
    // Don't break the page if prefetching fails
  }

  return ( 
    <div className="flex flex-col min-h-screen pt-16">
      <HydrationBoundary state={dehydrate(queryClient)}>
       <Suspense fallback={<SearchFiltersSkeleton />}>
         <SearchFilters />
       </Suspense>
      </HydrationBoundary>
      <div className="flex-1 bg-[#F4F4F0]">
         {children}
      </div>
      <Footer />
    </div>
  );
};
 
export default Layout;
