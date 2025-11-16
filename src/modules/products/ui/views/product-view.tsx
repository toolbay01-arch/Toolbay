"use client";

import Link from "next/link";
import Image from "next/image";
import { Fragment, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, LinkIcon, StarIcon, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const BuyNowButton = dynamic(
  () => import("../components/buy-now-button").then(
    (mod) => mod.BuyNowButton,
  ),
  {
    ssr: false,
    loading: () => <Button disabled className="flex-1 bg-green-600">Buy Now</Button>
  },
);

interface ProductViewProps {
  productId: string;
  tenantSlug: string;
};

export const ProductView = ({ productId, tenantSlug }: ProductViewProps) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(trpc.products.getOne.queryOptions({ id: productId }));

  const [isCopied, setIsCopied] = useState(false);
  
  // Get current user session to check if logged in
  const { data: session } = useQuery(trpc.auth.session.queryOptions());
  
  // Start conversation mutation
  const startConversation = useMutation(trpc.chat.startConversation.mutationOptions({
    onSuccess: (data) => {
      // Just navigate immediately - the page will fetch fresh data with messages included
      router.push(`/chat/${data.id}`);
      toast.success("Chat started with seller");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start chat");
    },
  }));
  
  const handleContactSeller = () => {
    if (!session?.user) {
      toast.error("Please log in to contact the seller");
      router.push("/sign-in");
      return;
    }
    
    // Use the tenantOwnerId from the product data
    const tenantOwnerId = (data as any)?.tenantOwnerId;
    
    if (!tenantOwnerId) {
      toast.error("Unable to contact seller. Please try again later.");
      return;
    }
    
    // Don't allow messaging yourself
    if (tenantOwnerId === session.user.id) {
      toast.error("You cannot message yourself");
      return;
    }
    
    // Build the product URL
    const productUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/tenants/${tenantSlug}/products/${productId}`;
    
    // Create rich initial message with product details
    const initialMessage = `Hello, I am interested in the following item:\n${productUrl}\n\nPlease contact me.`;
    
    startConversation.mutate({
      participantId: tenantOwnerId,
      productId: productId,
      initialMessage: initialMessage,
    });
  };
  
  // Show skeleton while loading
  if (isLoading || !data) {
    return <ProductViewSkeleton />;
  }

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
                  <p className="text-xs text-muted-foreground text-center">
                    per {data.unit || "unit"}
                  </p>
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

            {/* Description Row - Only show if description exists */}
            {data.description && (
              <div className="p-6 border-b">
                <RichText data={data.description} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 p-6 border-b">
              {/* Cart and Buy Now Buttons in 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <BuyNowButton
                  isPurchased={data.isPurchased}
                  productId={productId}
                  productName={data.name}
                  productPrice={data.price}
                  tenantSlug={tenantSlug}
                  quantity={data.quantity || 0}
                  minOrderQuantity={data.minOrderQuantity || 1}
                  maxOrderQuantity={data.maxOrderQuantity || undefined}
                  unit={data.unit || "unit"}
                  stockStatus={data.stockStatus || "in_stock"}
                  allowBackorder={data.allowBackorder || false}
                />
              </div>
              
              {/* Contact Seller and Share Buttons in 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Contact Seller Button */}
                <Button
                  variant="elevated"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  onClick={handleContactSeller}
                  disabled={startConversation.isPending || !data?.tenant}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {startConversation.isPending ? "Starting chat..." : "Contact Seller"}
                </Button>
                
                {/* Share Button */}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          
          {/* LEFT SIDE - Product Details Skeleton */}
          <div className="order-2 lg:order-1 border-t lg:border-t-0 lg:border-r">
            <div className="p-6 space-y-4">
              {/* Title skeleton */}
              <div className="h-10 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
            
            <div className="border-y flex flex-wrap">
              {/* Price skeleton */}
              <div className="px-6 py-4 flex items-center justify-center border-r">
                <div className="h-12 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              {/* Tenant skeleton */}
              <div className="px-6 py-4 flex items-center justify-center border-r">
                <div className="flex items-center gap-2">
                  <div className="size-5 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              
              {/* Rating skeleton */}
              <div className="px-6 py-4 flex items-center justify-center border-r">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              {/* Stock skeleton */}
              <div className="px-6 py-4 flex items-center justify-center">
                <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Description skeleton */}
            <div className="p-6 border-b space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
            </div>

            {/* Buttons skeleton */}
            <div className="p-6 border-b space-y-4">
              <div className="h-12 bg-gray-200 rounded animate-pulse w-full"></div>
              <div className="h-12 bg-gray-200 rounded animate-pulse w-full"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mx-auto"></div>
            </div>

            {/* Ratings skeleton */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Image Skeleton */}
          <div className="order-1 lg:order-2">
            <div className="relative aspect-square bg-gray-100">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">
                  <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}