"use client";

import { Suspense, useState, useEffect } from "react"
import { Grid3x3, List } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProductSort } from "../components/product-sort"
import { ProductFilters } from "../components/product-filters"
import { ProductList, ProductListSkeleton } from "../components/product-list"

interface Props {
  category?: string;
  tenantSlug?: string;
  narrowView?: boolean;
};

export const ProductListView = ({ category, tenantSlug, narrowView }: Props) => {
  // Set initial view mode based on screen size
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    // Check screen size and set default view mode
    const checkScreenSize = () => {
      if (window.innerWidth < 768) { // md breakpoint
        setViewMode("list");
      } else {
        setViewMode("grid");
      }
    };

    // Set initial view mode
    checkScreenSize();

    // Add listener for screen resize
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="px-2 sm:px-4 lg:px-12 py-8 flex flex-col gap-4 overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center gap-y-2 lg:gap-y-0 justify-between">
        <p className="text-2xl font-medium">Curated for you</p>
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "grid" | "list")} className="justify-start">
            <ToggleGroupItem value="grid" aria-label="Grid view" className="text-xs sm:text-sm">
              <Grid3x3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Grid</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="text-xs sm:text-sm">
              <List className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <ProductSort />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 xl:grid-cols-8 gap-y-6 gap-x-12">
        <div className="lg:col-span-2 xl:col-span-2">
          <ProductFilters />
        </div>
        <div className="lg:col-span-4 xl:col-span-6 overflow-x-hidden">
          <Suspense fallback={<ProductListSkeleton narrowView={narrowView} viewMode={viewMode} />}>
            <ProductList category={category} tenantSlug={tenantSlug} narrowView={narrowView} viewMode={viewMode} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
