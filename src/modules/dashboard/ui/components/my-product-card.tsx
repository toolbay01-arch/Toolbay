import React from "react";
import Link from "next/link";
import Image from "next/image";
import { StarIcon, EyeOffIcon, ArchiveIcon, Edit2Icon, Trash2Icon, PackageXIcon } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ImageCarousel } from "./image-carousel";

interface MyProductCardProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  gallery?: Array<{ url: string; alt: string }> | null;
  tenantSlug: string;
  tenantImageUrl?: string | null;
  reviewRating: number;
  reviewCount: number;
  price: number;
  isPrivate?: boolean;
  isArchived?: boolean;
  stockStatus?: string;
  quantity?: number;
  viewMode?: "grid" | "list";
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
}

export const MyProductCard = ({
  id,
  name,
  imageUrl,
  gallery,
  tenantSlug,
  tenantImageUrl,
  reviewRating,
  reviewCount,
  price,
  isPrivate,
  isArchived,
  stockStatus,
  quantity,
  viewMode = "grid",
  onEdit,
  onDelete,
}: MyProductCardProps) => {
  const isOutOfStock = stockStatus === "out_of_stock";
  // Generate URLs consistently for server/client
  const productUrl = `/tenants/${tenantSlug}/products/${id}`;

  // Prepare images for carousel
  const images = gallery && gallery.length > 0
    ? gallery
    : imageUrl
    ? [{ url: imageUrl, alt: name }]
    : [{ url: "/placeholder.png", alt: name }];

  // Render list view
  if (viewMode === "list") {
    return (
      <div className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow border rounded-md bg-white overflow-hidden flex flex-row max-w-full">
        {/* Image on the left - square, 25% wider on mobile */}
        <Link href={productUrl} className="relative w-28 h-28 xs:w-36 xs:h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 group shrink-0" prefetch={false}>
          {images.length > 1 ? (
            <ImageCarousel
              images={images}
              className="w-full h-full"
              sizes="(max-width: 475px) 112px, (max-width: 640px) 144px, (max-width: 768px) 160px, 192px"
              loading="lazy"
              quality={75}
            />
          ) : (
            <Image
              alt={name}
              fill
              src={images[0]?.url || "/placeholder.png"}
              className="object-cover"
              sizes="(max-width: 475px) 112px, (max-width: 640px) 144px, (max-width: 768px) 160px, 192px"
              loading="lazy"
              quality={75}
            />
          )}
          {/* Status badges */}
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex flex-col gap-0.5 sm:gap-1 z-10">
            {isOutOfStock && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-red-500 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium">
                <PackageXIcon className="size-2 sm:size-3" />
                <span className="hidden sm:inline">Out of Stock</span>
              </div>
            )}
            {isPrivate && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-yellow-500 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium">
                <EyeOffIcon className="size-2 sm:size-3" />
                <span className="hidden sm:inline">Private</span>
              </div>
            )}
            {isArchived && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-500 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium">
                <ArchiveIcon className="size-2 sm:size-3" />
                <span className="hidden sm:inline">Archived</span>
              </div>
            )}
          </div>
        </Link>
        
        {/* Middle section - Product details */}
        <div className="flex-1 p-1 xs:p-2 sm:p-3 md:p-4 flex flex-col justify-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 min-w-0">
          <Link href={productUrl} className="hover:text-gray-700" prefetch={false}>
            <h2 className="text-sm xs:text-base sm:text-lg font-medium line-clamp-2">{name}</h2>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 min-w-0">
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
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{tenantSlug}</p>
          </div>
          
          {reviewCount > 0 && (
            <div className="flex items-center gap-0.5 sm:gap-1">
              <StarIcon className="size-2.5 xs:size-3 sm:size-3.5 fill-black" />
              <p className="text-xs sm:text-sm font-medium">
                {reviewRating.toFixed(1)} ({reviewCount})
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative px-1 xs:px-1.5 sm:px-2 py-0.5 border bg-pink-400 w-fit">
              <p className="text-xs xs:text-sm font-medium">
                {formatCurrency(price)}
              </p>
            </div>
            {quantity !== undefined && (
              <div className={`text-xs xs:text-sm font-medium ${
                quantity === 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {quantity === 0 ? '0 remaining' : `${quantity} available`}
              </div>
            )}
          </div>
        </div>
        
        {/* Right section - Action buttons stacked vertically */}
        <div className="flex flex-col p-1 xs:p-2 sm:p-3 md:p-4 gap-1 sm:gap-2 justify-center border-l">
          {onEdit && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                onEdit(id);
              }}
              variant="outline"
              size="sm"
              className="whitespace-nowrap px-1.5 xs:px-2 sm:px-3 md:px-4 text-xs xs:text-sm"
            >
              <Edit2Icon className="size-3 xs:size-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                onDelete(id, name);
              }}
              variant="outline"
              size="sm"
              className="whitespace-nowrap px-1.5 xs:px-2 sm:px-3 md:px-4 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs xs:text-sm"
            >
              <Trash2Icon className="size-3 xs:size-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Render grid view (default)
  return (
    <div className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow border rounded-md bg-white overflow-hidden h-full flex flex-col">
      <Link href={productUrl} className="relative aspect-square group" prefetch={false}>
        {images.length > 1 ? (
          <ImageCarousel
            images={images}
            className="aspect-square"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            quality={75}
          />
        ) : (
          <Image
            alt={name}
            fill
            src={images[0]?.url || "/placeholder.png"}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            quality={75}
          />
        )}
        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {isOutOfStock && (
            <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
              <PackageXIcon className="size-3" />
              Out of Stock
            </div>
          )}
          {isPrivate && (
            <div className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
              <EyeOffIcon className="size-3" />
              Private
            </div>
          )}
          {isArchived && (
            <div className="flex items-center gap-1 bg-gray-500 text-white px-2 py-1 rounded text-xs font-medium">
              <ArchiveIcon className="size-3" />
              Archived
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-4 border-y flex flex-col gap-3 flex-1">
        <Link href={productUrl} className="hover:text-gray-700" prefetch={false}>
          <h2 className="text-lg font-medium line-clamp-4">{name}</h2>
        </Link>
        
        <div className="flex items-center gap-2">
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
          <p className="text-sm font-medium text-gray-600">{tenantSlug}</p>
        </div>
        
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
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="relative px-2 py-1 border bg-pink-400 w-fit">
            <p className="text-sm font-medium">
              {formatCurrency(price)}
            </p>
          </div>
          {quantity !== undefined && (
            <div className={`text-sm font-medium ${
              quantity === 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {quantity === 0 ? '0 remaining' : `${quantity} available`}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {onEdit && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                onEdit(id);
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Edit2Icon className="size-3.5 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                onDelete(id, name);
              }}
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2Icon className="size-3.5 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const MyProductCardSkeleton = () => {
  return (
    <div className="w-full aspect-3/4 bg-neutral-200 rounded-lg animate-pulse" />
  );
};
