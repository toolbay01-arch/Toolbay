"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { formatCurrency, generateTenantPath } from "@/lib/utils";
import { ImageCarousel } from "@/modules/dashboard/ui/components/image-carousel";

interface SuggestedProductCardProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  gallery?: Array<{ url: string; alt: string }> | null;
  tenantSlug: string;
  price: number;
  priority?: boolean;
};

export const SuggestedProductCard = ({
  id,
  name,
  imageUrl,
  gallery,
  tenantSlug,
  price,
  priority = false,
}: SuggestedProductCardProps) => {
  const router = useRouter();
  
  // Generate URL for the product using the utility function
  const productUrl = generateTenantPath(tenantSlug, `/products/${id}`);

  const handleCardClick = (e: React.MouseEvent) => {
    router.push(productUrl);
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

  return (
    <div 
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-black rounded-lg bg-white overflow-hidden flex flex-col cursor-pointer h-full"
    >
      {/* Product Image */}
      <div className="relative aspect-square border-b-2 border-black">
        {images.length > 1 ? (
          <ImageCarousel
            images={images}
            className="aspect-square"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            {...(priority ? { priority: true } : { loading: "lazy" })}
            quality={75}
          />
        ) : (
          <Image
            alt={name}
            fill
            src={images[0]?.url || "/placeholder.png"}
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            {...(priority ? { priority: true } : { loading: "lazy" })}
            quality={75}
          />
        )}
      </div>
      
      {/* Product Details - Only Name and Price */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Product Name */}
        <h3 className="text-sm font-semibold line-clamp-2 hover:text-gray-700">
          {name}
        </h3>
        
        {/* Price */}
        <div className="flex items-center gap-2 mt-auto">
          <div className="relative px-2 py-1 border-2 border-black bg-pink-400 w-fit rounded">
            <p className="text-sm font-bold">
              {formatCurrency(price)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SuggestedProductCardSkeleton = () => {
  return (
    <div className="w-full aspect-[3/4] bg-neutral-200 rounded-lg animate-pulse border-2 border-black" />
  );
};

