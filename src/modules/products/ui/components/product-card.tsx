"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { StarIcon } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import { ImageCarousel } from "@/modules/dashboard/ui/components/image-carousel";
import { StockStatusBadge } from "@/components/quantity-selector";

interface ProductCardProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  gallery?: Array<{ url: string; alt: string }> | null;
  tenantSlug: string;
  tenantImageUrl?: string | null;
  reviewRating: number;
  reviewCount: number;
  price: number;
  quantity?: number;
  unit?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock" | "pre_order";
  viewMode?: "grid" | "list";
  priority?: boolean; // For above-the-fold images
};

export const ProductCard = ({
  id,
  name,
  imageUrl,
  gallery,
  tenantSlug,
  tenantImageUrl,
  reviewRating,
  reviewCount,
  price,
  quantity = 0,
  unit = "unit",
  stockStatus = "in_stock",
  viewMode = "grid",
  priority = false,
}: ProductCardProps) => {
  const router = useRouter();
  
  // Generate URLs consistently for server/client
  const productUrl = `/tenants/${tenantSlug}/products/${id}`;
  const tenantUrl = `/tenants/${tenantSlug}`;

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if not clicking on interactive elements
    const target = e.target as HTMLElement;
    const closestButton = target.closest('button');
    
    if (closestButton) {
      return; // Let button handle its own click
    }
    
    // Navigate immediately - router.push is synchronous
    router.push(productUrl);
  };

  const handleTenantClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    router.push(tenantUrl);
  };
  
  // Prefetch on hover for instant navigation
  const handleMouseEnter = () => {
    router.prefetch(productUrl);
  };

  // Prepare images for carousel
  const images = gallery && gallery.length > 0
    ? gallery
    : imageUrl
    ? [{ url: imageUrl, alt: name }]
    : [{ url: "/placeholder.png", alt: name }];

  // List view layout
  if (viewMode === "list") {
    return (
      <div 
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border rounded-md bg-white overflow-hidden flex flex-row cursor-pointer max-w-full"
      >
        {/* Image on the left - square, 25% wider on mobile */}
        <div className="relative w-28 h-28 xs:w-36 xs:h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 shrink-0">
          {images.length > 1 ? (
            <ImageCarousel
              images={images}
              className="w-full h-full"
              sizes="(max-width: 475px) 112px, (max-width: 640px) 144px, (max-width: 768px) 160px, 192px"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              quality={75}
            />
          ) : (
            <Image
              alt={name}
              fill
              src={images[0]?.url || "/placeholder.png"}
              className="object-cover"
              sizes="(max-width: 475px) 112px, (max-width: 640px) 144px, (max-width: 768px) 160px, 192px"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              quality={75}
            />
          )}
        </div>
        
        {/* Middle section - Product details */}
        <div className="flex-1 p-1 xs:p-2 sm:p-3 md:p-4 flex flex-col justify-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 min-w-0">
          {/* Product Name with Stock Badge */}
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <h2 className="text-sm xs:text-base sm:text-lg font-medium line-clamp-2 hover:text-gray-700 flex-1">{name}</h2>
            <StockStatusBadge stockStatus={stockStatus} quantity={stockStatus === "low_stock" ? quantity : undefined} />
          </div>
          
          <button 
            type="button"
            className="flex items-center gap-1 sm:gap-1.5 md:gap-2 hover:opacity-80 w-fit cursor-pointer z-10"
            onClick={handleTenantClick}
          >
            {tenantImageUrl && (
              <Image
                alt={tenantSlug}
                src={tenantImageUrl}
                width={14}
                height={14}
                className="rounded-full border shrink-0 size-[12px] xs:size-[14px] sm:size-[16px]"
                loading="lazy"
                quality={75}
              />
            )}
            <p className="text-xs sm:text-sm underline font-medium truncate">{tenantSlug}</p>
          </button>
          
          {/* Reviews */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-0.5 sm:gap-1">
              <StarIcon className="size-2.5 xs:size-3 sm:size-3.5 fill-black" />
              <p className="text-xs sm:text-sm font-medium">
                {reviewRating.toFixed(1)} ({reviewCount})
              </p>
            </div>
          )}
          
          {/* Price and unit */}
          <div className="flex items-end gap-1 sm:gap-2">
            <div className="relative px-1 xs:px-1.5 sm:px-2 py-0.5 border bg-pink-400 w-fit">
              <p className="text-xs xs:text-sm font-medium">
                {formatCurrency(price)}
              </p>
            </div>
            <p className="text-[10px] xs:text-xs text-muted-foreground">
              per {unit || "unit"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Grid view layout (default)
  return (
    <div 
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border rounded-md bg-white overflow-hidden h-full flex flex-col cursor-pointer"
    >
      <div className="relative aspect-square">
        {images.length > 1 ? (
          <ImageCarousel
            images={images}
            className="aspect-square"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            quality={75}
          />
        ) : (
          <Image
            alt={name}
            fill
            src={images[0]?.url || "/placeholder.png"}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            quality={75}
          />
        )}
      </div>
      
      <div className="p-4 border-y flex flex-col gap-3 flex-1">
        {/* Product Name with Stock Badge */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-medium line-clamp-4 hover:text-gray-700 flex-1">{name}</h2>
          <StockStatusBadge stockStatus={stockStatus} quantity={stockStatus === "low_stock" ? quantity : undefined} />
        </div>
        
        <button 
          type="button"
          className="flex items-center gap-2 hover:opacity-80 w-fit cursor-pointer z-10"
          onClick={handleTenantClick}
        >
          {tenantImageUrl && (
            <Image
              alt={tenantSlug}
              src={tenantImageUrl}
              width={16}
              height={16}
              className="rounded-full border shrink-0 size-[16px]"
              loading="lazy"
              quality={75}
            />
          )}
          <p className="text-sm underline font-medium">{tenantSlug}</p>
        </button>
        
        {/* Reviews */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1">
            <StarIcon className="size-3.5 fill-black" />
            <p className="text-sm font-medium">
              {reviewRating.toFixed(1)} ({reviewCount})
            </p>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-end justify-between">
          <div className="relative px-2 py-1 border bg-pink-400 w-fit">
            <p className="text-sm font-medium">
              {formatCurrency(price)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            per {unit || "unit"}
          </p>
        </div>
      </div>
    </div>
  )
};

export const ProductCardSkeleton = () => {
  return (
    <div className="w-full aspect-3/4 bg-neutral-200 rounded-lg animate-pulse" />
  );
};
