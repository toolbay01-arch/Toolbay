import React from "react";
import Link from "next/link";
import Image from "next/image";
import { StarIcon, ShieldCheck, Package } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  tenantSlug: string;
  tenantName?: string;
  tenantImageUrl?: string | null;
  tenantIsVerified?: boolean;
  tenantSuccessfulOrders?: number;
  reviewRating: number;
  reviewCount: number;
  price: number;
  unit?: string;
};

export const ProductCard = ({
  id,
  name,
  imageUrl,
  tenantSlug,
  tenantName,
  tenantImageUrl,
  tenantIsVerified = false,
  tenantSuccessfulOrders = 0,
  reviewRating,
  reviewCount,
  price,
  unit = "unit",
}: ProductCardProps) => {
  return (
    <Link prefetch href={`/library/${id}`}>
      <div className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-black rounded-lg bg-white overflow-hidden h-full flex flex-col">
        {/* Product Image */}
        <div className="relative aspect-square border-b-2 border-black">
          <Image
            alt={name}
            fill
            src={imageUrl || "/placeholder.png"}
            className="object-cover"
          />
        </div>
        
        {/* Product Details */}
        <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 flex-1">
          <h2 className="text-sm sm:text-base font-semibold line-clamp-2">
            {name}
          </h2>
          
          {/* Price with unit */}
          <div className="flex items-center gap-2">
            <div className="relative px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-black bg-pink-400 w-fit rounded">
              <p className="text-base sm:text-lg font-bold">
                {price.toLocaleString('en-RW')} RWF
              </p>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              per {unit}
            </p>
          </div>
          
          {/* Seller Info */}
          <div className="flex flex-col gap-1.5 sm:gap-2 mt-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {tenantImageUrl && (
                <Image
                  alt={tenantSlug}
                  src={tenantImageUrl}
                  width={20}
                  height={20}
                  className="rounded-full border-2 border-black shrink-0 size-[18px] sm:size-[20px]"
                />
              )}
              <p className="text-xs sm:text-sm font-semibold truncate">
                {tenantName || tenantSlug}
              </p>
            </div>
            
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
    </Link>
  )
};

export const ProductCardSkeleton = () => {
  return (
    <div className="w-full aspect-3/4 bg-neutral-200 rounded-lg animate-pulse" />
  );
};
