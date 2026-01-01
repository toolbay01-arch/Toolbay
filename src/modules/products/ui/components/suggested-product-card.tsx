"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { formatCurrency, generateTenantURL } from "@/lib/utils";
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
  const [isAlreadyOnTenantSubdomain, setIsAlreadyOnTenantSubdomain] = useState(false);
  
  const isSubdomainRoutingEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING === "true";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";
  const tenantUrl = generateTenantURL(tenantSlug);
  
  // Check if user is already on this tenant's subdomain
  useEffect(() => {
    if (typeof window !== 'undefined' && isSubdomainRoutingEnabled && rootDomain) {
      const currentHostname = window.location.hostname;
      const expectedSubdomain = `${tenantSlug}.${rootDomain.split(':')[0]}`;
      setIsAlreadyOnTenantSubdomain(currentHostname === expectedSubdomain);
    }
  }, [tenantSlug, isSubdomainRoutingEnabled, rootDomain]);
  
  // Generate URL for the product - use short path only if on tenant's subdomain
  const productUrl = isAlreadyOnTenantSubdomain 
    ? `/products/${id}` 
    : `/tenants/${tenantSlug}/products/${id}`;

  const handleCardClick = (e: React.MouseEvent) => {
    // If subdomain routing enabled and not on the tenant's subdomain, navigate to full subdomain URL
    if (isSubdomainRoutingEnabled && rootDomain && !isAlreadyOnTenantSubdomain) {
      window.location.href = `${tenantUrl}/products/${id}`;
      return;
    }
    
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

