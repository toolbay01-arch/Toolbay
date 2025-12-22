import { useEffect, useState } from "react";
import { ListFilterIcon, SearchIcon, FilterIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { CategoriesSidebar } from "./categories-sidebar";
import { FiltersSidebar } from "./filters-sidebar";

interface Props {
  disabled?: boolean;
  defaultValue?: string | undefined;
  onChange?: (value: string) => void;
};

export const SearchInput = ({
  disabled,
  defaultValue,
  onChange,
}: Props) => {
  const [searchValue, setSearchValue] = useState(defaultValue || "");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onChange?.(searchValue)
    }, 500);

    return () => clearTimeout(timeoutId); 
  }, [searchValue, onChange]);

  return (
    <>
      <CategoriesSidebar open={isSidebarOpen} onOpenChange={setIsSidebarOpen} />
      <FiltersSidebar open={isFiltersOpen} onOpenChange={setIsFiltersOpen} />
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="relative w-full min-w-0 flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
          <Input 
            className="pl-8 w-full min-w-0" 
            placeholder="Search products" 
            disabled={disabled}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <Button
          variant="elevated"
          className="size-12 shrink-0 flex lg:hidden"
          onClick={() => setIsSidebarOpen(true)}
        >
          <ListFilterIcon />
        </Button>
        <Button
          variant="elevated"
          className="shrink-0 whitespace-nowrap"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
        >
          <FilterIcon className="mr-2 hidden sm:inline" />
          <span className="hidden sm:inline">Filters</span>
          <FilterIcon className="sm:hidden" />
        </Button>
      </div>
    </>
  );
};
