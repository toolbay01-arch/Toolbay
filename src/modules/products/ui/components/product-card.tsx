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
    
    // Don't prevent default - let browser handle navigation normally
    // This provides visual feedback (loading bar, URL change)
    router.push(productUrl);
  };

  const handleTenantClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    router.push(tenantUrl);
  };

  // Prepare images for carousel
  const images = gallery && gallery.length > 0
    ? gallery
    : imageUrl
    ? [{ url: imageUrl, alt: name }]
    : [{ url: "/placeholder.png", alt: name }];

  return (
    <div 
      onClick={handleCardClick}
      className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow border rounded-md bg-white overflow-hidden h-full flex flex-col cursor-pointer" 
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
