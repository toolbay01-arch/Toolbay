"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { StarIcon, ShieldCheck, Package } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import { ImageCarousel } from "@/modules/dashboard/ui/components/image-carousel";
import { StockStatusBadge } from "@/components/quantity-selector";

interface ProductCardProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  gallery?: Array<{ url: string; alt: string }> | null;
  tenantSlug: string;
  tenantName?: string;
  tenantImageUrl?: string | null;
  tenantIsVerified?: boolean;
  tenantSuccessfulOrders?: number;
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
  tenantName,
  tenantImageUrl,
  tenantIsVerified = false,
  tenantSuccessfulOrders = 0,
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
        className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-black rounded-lg bg-white overflow-hidden flex flex-row cursor-pointer max-w-full"
      >
        {/* Image on the left */}
        <div className="relative w-42 h-42 xs:w-54 xs:h-54 sm:w-40 sm:h-40 md:w-48 md:h-48 shrink-0 border-r-2 border-black">
          {images.length > 1 ? (
            <ImageCarousel
              images={images}
              className="w-full h-full"
              sizes="(max-width: 475px) 168px, (max-width: 640px) 216px, (max-width: 768px) 160px, 192px"
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
              sizes="(max-width: 475px) 168px, (max-width: 640px) 216px, (max-width: 768px) 160px, 192px"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              quality={75}
            />
          )}
        </div>
        
        {/* Product details */}
        <div className="flex-1 p-2 xs:p-3 sm:p-4 flex flex-col justify-between gap-1.5 xs:gap-2 min-w-0">
          {/* Product Name with Stock Badge */}
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <h2 className="text-sm xs:text-base sm:text-lg font-semibold line-clamp-2 hover:text-gray-700 flex-1">
              {name}
            </h2>
            <StockStatusBadge 
              stockStatus={stockStatus} 
              quantity={stockStatus === "low_stock" ? quantity : undefined} 
            />
          </div>
          
          {/* Price with unit */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative px-2 sm:px-3 py-1 sm:py-1.5 border-2 border-black bg-pink-400 w-fit rounded">
              <p className="text-sm xs:text-base sm:text-lg font-bold">
                {formatCurrency(price)}
              </p>
            </div>
            <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
              per {unit || "unit"}
            </p>
          </div>
          
          {/* Seller Info */}
          <div className="flex flex-col gap-1">
            <button 
              type="button"
              className="flex items-center gap-1 sm:gap-1.5 hover:opacity-80 w-fit cursor-pointer z-10"
              onClick={handleTenantClick}
            >
              {tenantImageUrl && (
                <Image
                  alt={tenantSlug}
                  src={tenantImageUrl}
                  width={16}
                  height={16}
                  className="rounded-full border-2 border-black shrink-0 size-[14px] xs:size-[16px] sm:size-[18px]"
                  loading="lazy"
                  quality={75}
                />
              )}
              <p className="text-xs sm:text-sm font-semibold truncate">
                {tenantName || tenantSlug}
              </p>
            </button>
            
            {/* Verification Badge & Successful Orders */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {tenantIsVerified && (
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <ShieldCheck className="size-3 sm:size-3.5 text-green-600 fill-green-100" />
                  <p className="text-[10px] xs:text-xs sm:text-sm font-medium text-green-700">Verified</p>
                </div>
              )}
              
              {tenantSuccessfulOrders > 0 && (
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Package className="size-3 sm:size-3.5 text-blue-600" />
                  <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
                    {tenantSuccessfulOrders} order{tenantSuccessfulOrders !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
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
      className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-black rounded-lg bg-white overflow-hidden h-full flex flex-col cursor-pointer"
    >
      {/* Product Image */}
      <div className="relative aspect-square border-b-2 border-black">
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
      
      {/* Product Details */}
      <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 flex-1">
        {/* Product Name with Stock Status */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm sm:text-base font-semibold line-clamp-2 hover:text-gray-700 flex-1">
            {name}
          </h2>
          <StockStatusBadge 
            stockStatus={stockStatus} 
            quantity={stockStatus === "low_stock" ? quantity : undefined} 
          />
        </div>
        
        {/* Price with unit */}
        <div className="flex items-center gap-2">
          <div className="relative px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-black bg-pink-400 w-fit rounded">
            <p className="text-base sm:text-lg font-bold">
              {formatCurrency(price)}
            </p>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            per {unit || "unit"}
          </p>
        </div>
        
        {/* Seller Info */}
        <div className="flex flex-col gap-1.5 sm:gap-2 mt-auto">
          <button 
            type="button"
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 w-fit cursor-pointer z-10"
            onClick={handleTenantClick}
          >
            {tenantImageUrl && (
              <Image
                alt={tenantSlug}
                src={tenantImageUrl}
                width={20}
                height={20}
                className="rounded-full border-2 border-black shrink-0 size-[18px] sm:size-[20px]"
                loading="lazy"
                quality={75}
              />
            )}
            <p className="text-xs sm:text-sm font-semibold truncate">
              {tenantName || tenantSlug}
            </p>
          </button>
          
          {/* Verification Badge */}
          {tenantIsVerified && (
            <div className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 sm:size-4 text-green-600 fill-green-100" />
              <p className="text-xs sm:text-sm font-medium text-green-700">Verified</p>
            </div>
          )}
          
          {/* Successful Orders */}
          {tenantSuccessfulOrders > 0 && (
            <div className="flex items-center gap-1">
              <Package className="size-3.5 sm:size-4 text-blue-600" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                {tenantSuccessfulOrders} successful order{tenantSuccessfulOrders !== 1 ? 's' : ''}
              </p>
            </div>
          )}
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
