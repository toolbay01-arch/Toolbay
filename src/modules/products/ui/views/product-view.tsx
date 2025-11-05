"use client";

import Link from "next/link";
import Image from "next/image";
import { Fragment, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { CheckIcon, LinkIcon, StarIcon } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { RichText } from "@payloadcms/richtext-lexical/react";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "@/components/star-rating";
import { formatCurrency, generateTenantURL } from "@/lib/utils";
import { ImageCarousel } from "@/modules/dashboard/ui/components/image-carousel";
import { StockStatusBadge } from "@/components/quantity-selector";

const CartButton = dynamic(
  () => import("../components/cart-button").then(
    (mod) => mod.CartButton,
  ),
  {
    ssr: false,
    loading: () => <Button disabled className="flex-1 bg-pink-400">Add to cart</Button>
  },
);

interface ProductViewProps {
  productId: string;
  tenantSlug: string;
};

export const ProductView = ({ productId, tenantSlug }: ProductViewProps) => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.products.getOne.queryOptions({ id: productId }));

  const [isCopied, setIsCopied] = useState(false);

  // Build gallery array from product data
  const images: Array<{ url: string; alt: string }> = [];
  
  // Type assertion for gallery field
  const productWithGallery = data as any;
  if (productWithGallery.gallery && Array.isArray(productWithGallery.gallery)) {
    productWithGallery.gallery.forEach((item: any) => {
      if (item.media && typeof item.media === 'object' && item.media.url) {
        images.push({
          url: item.media.url,
          alt: item.media.alt || data.name,
        });
      }
    });
  }
  
  // Fallback to main image if no gallery
  if (images.length === 0 && data.image?.url) {
    images.push({
      url: data.image.url,
      alt: data.name,
    });
  }

  return (
    <div className="px-4 lg:px-12 py-10">
      <div className="border rounded-sm bg-white overflow-hidden">
        {/* Two-column layout: Details on left (lg:order-1), Images on right (lg:order-2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          
          {/* LEFT SIDE - Product Details (Desktop: left, Mobile: bottom) */}
          <div className="order-2 lg:order-1 border-t lg:border-t-0 lg:border-r">
            <div className="p-6">
              <h1 className="text-4xl font-medium">{data.name}</h1>
            </div>
            
            <div className="border-y flex flex-wrap">
              <div className="px-6 py-4 flex items-center justify-center border-r">
                <div className="flex flex-col gap-2">
                  <div className="px-2 py-1 border bg-pink-400 w-fit">
                    <p className="text-base font-medium">{formatCurrency(data.price)}</p>
                  </div>
                  {data.unit && data.unit !== "unit" && (
                    <p className="text-xs text-muted-foreground text-center">
                      per {data.unit}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 flex items-center justify-center border-r">
                <Link href={generateTenantURL(tenantSlug)} className="flex items-center gap-2">
                  {data.tenant.image?.url && (
                    <Image
                      src={data.tenant.image.url}
                      alt={data.tenant.name}
                      width={20}
                      height={20}
                      className="rounded-full border shrink-0 size-[20px]"
                    />
                  )}
                  <p className="text-base underline font-medium">
                    {data.tenant.name}
                  </p>
                </Link>
              </div>

              <div className="px-6 py-4 flex items-center justify-center border-r">
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={data.reviewRating}
                    iconClassName="size-4"
                  />
                  <p className="text-base font-medium">
                    {data.reviewCount} ratings
                  </p>
                </div>
              </div>
              
              <div className="px-6 py-4 flex items-center justify-center">
                <StockStatusBadge 
                  stockStatus={data.stockStatus || "in_stock"} 
                  quantity={data.stockStatus === "low_stock" ? data.quantity : undefined}
                />
              </div>
            </div>

            <div className="p-6 border-b">
              {data.description ? (
                <RichText data={data.description} />
              ) : (
                <p className="font-medium text-muted-foreground italic">
                  No description provided
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 p-6 border-b">
              <div className="flex flex-col gap-2">
                <CartButton
                  isPurchased={data.isPurchased}
                  productId={productId}
                  tenantSlug={tenantSlug}
                  quantity={data.quantity || 0}
                  minOrderQuantity={data.minOrderQuantity || 1}
                  maxOrderQuantity={data.maxOrderQuantity || undefined}
                  unit={data.unit || "unit"}
                  stockStatus={data.stockStatus || "in_stock"}
                  allowBackorder={data.allowBackorder || false}
                />
                <Button
                  className="w-full"
                  variant="elevated"
                  onClick={() => {
                    setIsCopied(true);
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("URL copied to clipboard")

                    setTimeout(() => {
                      setIsCopied(false);
                    }, 1000);
                  }}
                  disabled={isCopied}
                >
                  {isCopied ? (
                    <>
                      <CheckIcon className="mr-2 h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" /> Share Product
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center font-medium">
                {data.refundPolicy === "no-refunds"
                  ? "No refunds"
                  : `${data.refundPolicy} money back guarantee`
                }
              </p>
            </div>

            {/* Ratings Section */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium">Ratings</h3>
                <div className="flex items-center gap-x-1 font-medium">
                  <StarIcon className="size-4 fill-black" />
                  <p>({data.reviewRating})</p>
                  <p className="text-base">{data.reviewCount} ratings</p>
                </div>
              </div>
              <div className="grid grid-cols-[auto_1fr_auto] gap-3">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <Fragment key={stars}>
                    <div className="font-medium">{stars} {stars === 1 ? "star" : "stars"}</div>
                    <Progress
                      value={data.ratingDistribution[stars]}
                      className="h-[1lh]"
                    />
                    <div className="font-medium">
                      {data.ratingDistribution[stars]}%
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Product Images (Desktop: right, Mobile: top) */}
          <div className="order-1 lg:order-2">
            <div className="relative aspect-square bg-gray-50">
              {images.length > 1 ? (
                <ImageCarousel
                  images={images}
                  className="aspect-square"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  loading="eager"
                  quality={90}
                />
              ) : (
                <Image
                  src={images[0]?.url || "/placeholder.png"}
                  alt={data.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProductViewSkeleton = () => {
  return (
    <div className="px-4 lg:px-12 py-10">
      <div className="border rounded-sm bg-white overflow-hidden">
        <div className="relative aspect-[3.9] border-b">
          <Image
            src={"/placeholder.png"}
            alt="Placeholder"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  )
}