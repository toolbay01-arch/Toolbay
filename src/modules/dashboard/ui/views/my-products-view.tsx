"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon, SearchIcon, Loader2, Grid3x3, List } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { MyProductsList, MyProductsListSkeleton } from "../components/my-products-list";
import { ProductFormDialog } from "../components/product-form-dialog";
import { DeleteProductDialog } from "../components/delete-product-dialog";

export const MyProductsView = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Dialog state
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  // Check authentication and tenant status
  const { data: session, isLoading: sessionLoading } = useQuery(
    trpc.auth.session.queryOptions()
  );

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/sign-in");
    } else if (!sessionLoading && session?.user && !session.user.roles?.includes('tenant')) {
      router.push("/");
    }
  }, [session, sessionLoading, router]);

  // Set default view mode based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) { // md breakpoint
        setViewMode("list");
      } else {
        setViewMode("grid");
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user || !session.user.roles?.includes('tenant')) {
    return null;
  }

  const handleCreateProduct = () => {
    setDialogMode("create");
    setSelectedProductId(null);
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (productId: string) => {
    setDialogMode("edit");
    setSelectedProductId(productId);
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-2 xs:px-4 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 flex-col xs:flex-row gap-3 xs:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Products</h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                Manage your product listings
              </p>
            </div>
            <Button 
              onClick={handleCreateProduct}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full xs:w-auto text-sm sm:text-base"
              size="sm"
            >
              <PlusIcon className="size-3.5 sm:size-4 mr-1 sm:mr-2" />
              Add Product
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6">
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
        </div>

        {/* Products Grid */}
        <Suspense fallback={<MyProductsListSkeleton />}>
          <MyProductsList 
            searchQuery={debouncedSearch}
            viewMode={viewMode}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
          />
        </Suspense>
      </div>

      {/* Dialogs */}
      <ProductFormDialog
        open={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        productId={selectedProductId}
        mode={dialogMode}
      />
      
      <DeleteProductDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        productId={selectedProductId}
        productName={selectedProductName}
      />
    </div>
  );
};
