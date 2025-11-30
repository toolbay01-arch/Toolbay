"use client";

import { useParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";

import { useTRPC } from "@/trpc/client";

import { useProductFilters } from "@/modules/products/hooks/use-product-filters";

import { Categories } from "./categories";
import { SearchInput } from "./search-input";
import { BreadcrumbNavigation } from "./breadcrumb-navigation";
import { DEFAULT_BG_COLOR } from "../../../constants";
import { cn } from "@/lib/utils";

export const SearchFilters = () => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery({
    ...trpc.categories.getMany.queryOptions(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const [filters, setFilters] = useProductFilters();
  const [isSticky, setIsSticky] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const params = useParams();
  const categoryParam = params.category as string | undefined;
  const activeCategory = categoryParam || "all";

  const activeCategoryData = data.find((category) => category.slug === activeCategory);

  const activeCategoryColor = activeCategoryData?.color || DEFAULT_BG_COLOR;
  const activeCategoryName = activeCategoryData?.name || null;

  const activeSubcategory = params.subcategory as string | undefined;
  const activeSubcategoryName = 
    activeCategoryData?.subcategories?.find(
      (subcategory) => subcategory.slug === activeSubcategory
    )?.name || null;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingUp = currentScrollY < lastScrollY;
      
      // Only stick when scrolling up and past the initial position
      if (scrollingUp && currentScrollY > 64) {
        setIsSticky(true);
      } else if (currentScrollY <= 64) {
        // Don't stick at the top
        setIsSticky(false);
      } else if (!scrollingUp) {
        // When scrolling down, don't stick
        setIsSticky(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Calculate height for spacer when sticky
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setHeight(containerRef.current.offsetHeight);
      }
    };
    
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [data]);

  return (
    <>
      <div 
        ref={containerRef}
        className={cn(
          "px-4 lg:px-12 py-2 md:py-8 border-b flex flex-col gap-4 w-full transition-all",
          isSticky && "fixed top-16 left-0 right-0 z-40 shadow-md lg:top-16"
        )}
        style={{
          backgroundColor: activeCategoryColor,
        }}
      >
        <SearchInput
          defaultValue={filters.search} 
          onChange={(value) => setFilters({
            search: value
          })}
        />
        <div className="hidden lg:block">
          <Categories data={data} />
        </div>
        <BreadcrumbNavigation
          activeCategory={activeCategory}
          activeCategoryName={activeCategoryName}
          activeSubcategoryName={activeSubcategoryName}
        />
      </div>
      {isSticky && <div style={{ height }} />}
    </>
  );
};

export const SearchFiltersSkeleton = () => {
  return (
    <div className="px-4 lg:px-12 py-2 md:py-8 border-b flex flex-col gap-4 w-full" style={{
      backgroundColor: "#F5F5F5",
    }}>
      <SearchInput disabled />
      <div className="hidden lg:block">
        <div className="h-11" />
      </div>
    </div>
  );
};
