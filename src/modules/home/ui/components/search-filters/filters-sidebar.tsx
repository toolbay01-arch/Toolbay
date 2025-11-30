"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useProductFilters } from "@/modules/products/hooks/use-product-filters";
import { TagsFilter } from "@/modules/products/ui/components/tags-filter";
import { PriceFilter } from "@/modules/products/ui/components/price-filter";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductFilterProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

const ProductFilter = ({ title, className, children }: ProductFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const Icon = isOpen ? ChevronDownIcon : ChevronRightIcon;

  return (
    <div className={cn(
      "p-3 md:p-4 border-b flex flex-col gap-2",
      className
    )}>
      <div
        onClick={() => setIsOpen((current) => !current)}
        className="flex items-center justify-between cursor-pointer"
      >
        <p className="font-medium">{title}</p>
        <Icon className="size-5" />
      </div>
      {isOpen && children}
    </div>
  );
};

export const FiltersSidebar = ({
  open,
  onOpenChange,
}: Props) => {
  const [filters, setFilters] = useProductFilters();

  const hasAnyFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "sort") return false;

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === "string") {
      return value !== "";
    }

    return value !== null;
  });

  const onClear = () => {
    setFilters({
      minPrice: "",
      maxPrice: "",
      tags: [],
    });
  };

  const onChange = (key: keyof typeof filters, value: unknown) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 transition-none w-full sm:w-[400px]"
      >
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            {hasAnyFilters && (
              <button 
                className="underline cursor-pointer text-sm" 
                onClick={() => onClear()} 
                type="button"
              >
                Clear
              </button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="flex flex-col overflow-y-auto h-full pb-2">
          <div className="border rounded-md bg-white m-4">
            <ProductFilter title="Price">
              <PriceFilter
                minPrice={filters.minPrice}
                maxPrice={filters.maxPrice}
                onMinPriceChange={(value) => onChange("minPrice", value)}
                onMaxPriceChange={(value) => onChange("maxPrice", value)}
              />
            </ProductFilter>
            <ProductFilter title="Tags" className="border-b-0">
              <TagsFilter
                value={filters.tags}
                onChange={(value) => onChange("tags", value)}
              />
            </ProductFilter>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};




