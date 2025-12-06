"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { StarIcon, ShieldCheck, Package, TrendingUp, MapPin } from "lucide-react";

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
  tenantLocation?: string | null;
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
  totalSold?: number;
};

export const ProductCard = ({
  id,
  name,
  imageUrl,
  gallery,
  tenantSlug,
  tenantName,
  tenantImageUrl,
  tenantLocation,
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
  totalSold = 0,
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
        className="group hover:shadow-xl transition-all duration-300 border border-gray-200 rounded-2xl bg-white overflow-hidden flex flex-row cursor-pointer max-w-full hover:-translate-y-1"
      >
        {/* Image on the left - takes full height of card */}
        <div className="relative w-40 xs:w-48 sm:w-56 md:w-64 lg:w-72 shrink-0 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {images.length > 1 ? (
            <ImageCarousel
              images={images}
              className="w-full h-full"
              sizes="(max-width: 475px) 160px, (max-width: 640px) 192px, (max-width: 768px) 224px, (max-width: 1024px) 256px, 288px"
              {...(priority ? { priority: true } : { loading: "lazy" })}
              quality={75}
            />
          ) : (
            <Image
              alt={name}
              fill
              src={images[0]?.url || "/placeholder.png"}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 475px) 160px, (max-width: 640px) 192px, (max-width: 768px) 224px, (max-width: 1024px) 256px, 288px"
              {...(priority ? { priority: true } : { loading: "lazy" })}
              quality={75}
            />
          )}
          
          {/* Stock Status Badge - Floating */}
          <div className="absolute top-2 right-2 z-10">
            <StockStatusBadge 
              stockStatus={stockStatus} 
              quantity={stockStatus === "low_stock" ? quantity : undefined} 
            />
          </div>
        </div>
        
        {/* Product details */}
        <div className="flex-1 p-2 xs:p-3 sm:p-4 flex flex-col justify-between gap-1 xs:gap-1.5 min-w-0">
          {/* Product Name */}
          <h2 className="text-sm xs:text-base sm:text-lg font-semibold line-clamp-2 group-hover:text-pink-600 transition-colors">
            {name}
          </h2>
          
          {/* Price with unit */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl xs:text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
              {formatCurrency(price)}
            </span>
            <span className="text-xs sm:text-sm text-gray-500">
              / {unit || "unit"}
            </span>
          </div>
          
          {/* Stats Row */}
          <div className="flex items-center gap-2 xs:gap-2.5 text-xs sm:text-sm text-gray-600">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <StarIcon className="size-3.5 sm:size-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{reviewRating.toFixed(1)}</span>
              <span className="text-gray-400">({reviewCount})</span>
            </div>
            
            {/* Total Sold */}
            {totalSold > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="size-3 sm:size-3.5 text-orange-500" />
                  <span className="font-medium">{totalSold} sold</span>
                </div>
              </>
            )}
          </div>
          
          {/* Divider */}
          <div className="border-t border-gray-100 my-0.5"></div>
          
          {/* Seller Info */}
          <div className="flex flex-col gap-1">
            <button 
              type="button"
              className="flex items-center gap-1.5 sm:gap-2 hover:opacity-70 w-fit cursor-pointer z-10 transition-opacity"
              onClick={handleTenantClick}
            >
              {tenantImageUrl && (
                <Image
                  alt={tenantSlug}
                  src={tenantImageUrl}
                  width={20}
                  height={20}
                  className="rounded-full ring-2 ring-gray-100 shrink-0 size-[18px] sm:size-[20px]"
                  loading="lazy"
                  quality={75}
                />
              )}
              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                {tenantName || tenantSlug}
              </span>
            </button>
            
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Verification Badge */}
              {tenantIsVerified && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full">
                  <ShieldCheck className="size-2.5 sm:size-3 text-green-600" />
                  <span className="text-[10px] xs:text-xs font-medium text-green-700">Verified</span>
                </div>
              )}
              
              {/* Successful Orders */}
              {tenantSuccessfulOrders > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full">
                  <Package className="size-2.5 sm:size-3 text-blue-600" />
                  <span className="text-[10px] xs:text-xs text-blue-700">{tenantSuccessfulOrders} orders</span>
                </div>
              )}
            </div>
            
            {/* Tenant Location */}
            {tenantLocation && (
              <div className="flex items-center gap-1 text-gray-500">
                <MapPin className="size-3 sm:size-3.5" />
                <span className="text-[10px] xs:text-xs truncate">{tenantLocation}</span>
              </div>
            )}
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
      className="group hover:shadow-xl transition-all duration-300 border border-gray-200 rounded-2xl bg-white overflow-hidden h-full flex flex-col cursor-pointer hover:-translate-y-1"
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        {images.length > 1 ? (
          <ImageCarousel
            images={images}
            className="aspect-square"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            {...(priority ? { priority: true } : { loading: "lazy" })}
            quality={75}
          />
        ) : (
          <Image
            alt={name}
            fill
            src={images[0]?.url || "/placeholder.png"}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            {...(priority ? { priority: true } : { loading: "lazy" })}
            quality={75}
          />
        )}
        
        {/* Stock Status Badge - Floating */}
        <div className="absolute top-3 right-3 z-10">
          <StockStatusBadge 
            stockStatus={stockStatus} 
            quantity={stockStatus === "low_stock" ? quantity : undefined} 
          />
        </div>
      </div>
      
      {/* Product Details */}
      <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
        {/* Product Name */}
        <h2 className="text-sm sm:text-base font-semibold line-clamp-2 group-hover:text-pink-600 transition-colors min-h-[2.5rem]">
          {name}
        </h2>
        
        {/* Price with unit */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
            {formatCurrency(price)}
          </span>
          <span className="text-xs sm:text-sm text-gray-500">
            / {unit || "unit"}
          </span>
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-600">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <StarIcon className="size-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{reviewRating.toFixed(1)}</span>
            <span className="text-gray-400">({reviewCount})</span>
          </div>
          
          {/* Total Sold */}
          {totalSold > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="size-3.5 text-orange-500" />
                <span className="font-medium">{totalSold} sold</span>
              </div>
            </>
          )}
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-100 my-0.5"></div>
        
        {/* Seller Info */}
        <div className="flex flex-col gap-1.5 mt-auto">
          <button 
            type="button"
            className="flex items-center gap-1.5 hover:opacity-70 w-fit cursor-pointer z-10 transition-opacity"
            onClick={handleTenantClick}
          >
            {tenantImageUrl && (
              <Image
                alt={tenantSlug}
                src={tenantImageUrl}
                width={24}
                height={24}
                className="rounded-full ring-2 ring-gray-100 shrink-0"
                loading="lazy"
                quality={75}
              />
            )}
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              {tenantName || tenantSlug}
            </span>
          </button>
          
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Verification Badge */}
            {tenantIsVerified && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full">
                <ShieldCheck className="size-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">Verified</span>
              </div>
            )}
            
            {/* Successful Orders */}
            {tenantSuccessfulOrders > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full">
                <Package className="size-3 text-blue-600" />
                <span className="text-xs text-blue-700">{tenantSuccessfulOrders} orders</span>
              </div>
            )}
          </div>
          
          {/* Tenant Location */}
          {tenantLocation && (
            <div className="flex items-center gap-1 text-gray-500">
              <MapPin className="size-3.5" />
              <span className="text-xs truncate">{tenantLocation}</span>
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
