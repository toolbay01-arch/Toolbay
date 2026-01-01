"use client";

import Link from "next/link";
import Image from "next/image";
import { Fragment, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, LinkIcon, StarIcon, MessageCircle, ChevronDown, ChevronUp, Eye, Maximize2, Phone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RichText } from "@payloadcms/richtext-lexical/react";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "@/components/star-rating";
import { formatCurrency, generateTenantURL, generateTenantResourceURL } from "@/lib/utils";
import { ImageCarousel } from "@/modules/dashboard/ui/components/image-carousel";
import { StockStatusBadge } from "@/components/quantity-selector";
import { SuggestedProductCard, SuggestedProductCardSkeleton } from "../components/suggested-product-card";
import { useTrackProductView } from "@/hooks/use-track-product-view";
import { ImageLightbox } from "@/components/image-lightbox";

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
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(trpc.products.getOne.queryOptions({ id: productId }));
  
  // Track product view
  useTrackProductView(productId);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Fetch suggested products
  const { data: suggestedProducts, isLoading: isLoadingSuggested } = useQuery(
    trpc.products.getSuggested.queryOptions({
      productId,
      tenantSlug,
      limit: 8,
    })
  );

  const [isCopied, setIsCopied] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showAllRatings, setShowAllRatings] = useState(false);
  
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
      if (error.data?.code === "UNAUTHORIZED") {
        // Redirect to login page with return URL immediately (no toast to avoid flash)
        const loginUrl = `/sign-in?redirect=${encodeURIComponent(pathname)}`;
        router.prefetch(loginUrl);
        router.push(loginUrl);
      } else {
        toast.error(error.message || "Failed to start chat");
      }
    },
  }));
  
  const handleContactSeller = () => {
    if (!session?.user) {
      // Redirect to login with current product page as return URL
      const loginUrl = `/sign-in?redirect=${encodeURIComponent(pathname)}`;
      router.prefetch(loginUrl);
      router.push(loginUrl);
      return;
    }
    
    // Make sure product data is loaded
    if (!data) {
      toast.error("Product data not loaded. Please try again.");
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
    
    // Build the product URL using the utility function
    const productUrl = generateTenantResourceURL(tenantSlug, `/products/${productId}`);
    
    // Create message with product name as markdown link
    const productName = (data as any)?.name || 'this product';
    const initialMessage = `Hello, I am interested in this item:[${productName}](${productUrl})\n`;
    
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
    <div className="px-4 lg:px-12 py-10 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Two-column layout: Image on left (lg:order-1), Details on right (lg:order-2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            
            {/* LEFT SIDE - Product Image (Desktop: left, Mobile: top) */}
            <div className="order-1 lg:order-1">
              <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 group cursor-pointer">
                {/* Expand icon overlay */}
                <button
                  onClick={() => {
                    setLightboxIndex(0);
                    setLightboxOpen(true);
                  }}
                  className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                  aria-label="View full size"
                >
                  <Maximize2 className="h-5 w-5 text-gray-800" />
                </button>
                
                <div onClick={() => {
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }}>
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

            {/* RIGHT SIDE - Product Details (Desktop: right, Mobile: bottom) */}
            <div className="order-2 lg:order-2">
              {/* Product Title */}
              <div className="p-4 lg:p-6">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{data.name}</h1>
                
                {/* Price and Rating Row */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl lg:text-5xl font-bold text-gray-900">
                      {formatCurrency(data.price)}
                    </span>
                    <span className="text-sm text-gray-500">/ {data.unit || "unit"}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full">
                    <StarIcon className="size-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-gray-900">{data.reviewRating.toFixed(1)}</span>
                    <span className="text-sm text-gray-600">({data.reviewCount})</span>
                  </div>

                  {/* View Count */}
                  {(data as any).viewCount !== undefined && (data as any).viewCount > 0 && (
                    <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full">
                      <Eye className="size-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {((data as any).viewCount).toLocaleString()} view{(data as any).viewCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Stock Status */}
                <div className="mb-4">
                  <StockStatusBadge 
                    stockStatus={data.stockStatus || "in_stock"} 
                    quantity={data.stockStatus === "low_stock" ? data.quantity : undefined}
                  />
                </div>
              </div>

              {/* Seller Info Card */}
              <div className="px-4 lg:px-6 pb-4">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <Link href={generateTenantURL(tenantSlug)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      {data.tenant.image?.url && (
                        <Image
                          src={data.tenant.image.url}
                          alt={data.tenant.name}
                          width={40}
                          height={40}
                          className="rounded-full ring-3 ring-white shadow-md"
                        />
                      )}
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Sold by</p>
                        <p className="text-base font-semibold text-gray-900">{data.tenant.name}</p>
                      </div>
                    </Link>
                  </div>
                  
                  {/* Contact Phone Display */}
                  {data.tenant.contactPhone && (
                    <div className="mb-3 px-2 py-1.5 bg-white rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-0.5">Contact</p>
                      <p className="text-sm font-semibold text-gray-900">{data.tenant.contactPhone}</p>
                    </div>
                  )}
                  
                  {/* Contact Buttons */}
                  <div className="flex gap-2">
                    {/* Call Button */}
                    {data.tenant.contactPhone && (
                      <Button
                        asChild
                        variant="elevated"
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <a href={`tel:${data.tenant.contactPhone}`}>
                          <Phone className="mr-1.5 h-4 w-4" />
                          Call
                        </a>
                      </Button>
                    )}
                    
                    {/* Chat Button */}
                    <Button
                      variant="elevated"
                      size="sm"
                      className={`${data.tenant.contactPhone ? 'flex-1' : 'w-full'} bg-blue-600 hover:bg-blue-700 text-white`}
                      onClick={handleContactSeller}
                      disabled={startConversation.isPending || !data?.tenant}
                    >
                      <MessageCircle className="mr-1.5 h-4 w-4" />
                      {startConversation.isPending ? "..." : "Chat"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 lg:px-6 pb-4">
                <div className="border-t border-gray-200 pt-4 space-y-3">
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
                  
                  {/* Share Button */}
                  <Button
                    className="w-full"
                    variant="outline"
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

                  <p className="text-center text-sm font-medium text-gray-600 mt-2">
                    {data.refundPolicy === "no-refunds"
                      ? "⚠️ No refunds available"
                      : `✓ ${data.refundPolicy} money back guarantee`
                    }
                  </p>
                </div>
              </div>

              {/* Description - Expandable */}
              {data.description && (
                <div className="px-4 lg:px-6 pb-4">
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Description</h3>
                    <div className={`prose prose-sm max-w-none ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
                      <RichText data={data.description} />
                    </div>
                    {!isDescriptionExpanded && (
                      <button
                        onClick={() => setIsDescriptionExpanded(true)}
                        className="mt-1.5 text-sm font-medium text-pink-600 hover:text-pink-700 flex items-center gap-1"
                      >
                        View more <ChevronDown className="size-4" />
                      </button>
                    )}
                    {isDescriptionExpanded && (
                      <button
                        onClick={() => setIsDescriptionExpanded(false)}
                        className="mt-1.5 text-sm font-medium text-pink-600 hover:text-pink-700 flex items-center gap-1"
                      >
                        View less <ChevronUp className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Ratings Summary - Compact */}
              <div className="px-4 lg:px-6 pb-4">
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">Reviews</h3>
                    <div className="flex items-center gap-1.5 text-sm">
                      <StarIcon className="size-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{data.reviewRating.toFixed(1)}</span>
                      <span className="text-gray-500">• {data.reviewCount}</span>
                    </div>
                  </div>
                  
                  {!showAllRatings ? (
                    <div className="space-y-1.5">
                      {/* Show only top 2 ratings */}
                      {[5, 4].map((stars) => (
                        <div key={stars} className="grid grid-cols-[auto_1fr_auto] gap-2.5 items-center">
                          <span className="text-sm font-medium text-gray-700 w-14">{stars} star{stars !== 1 ? 's' : ''}</span>
                          <Progress
                            value={data.ratingDistribution[stars]}
                            className="h-2"
                          />
                          <span className="text-sm font-medium text-gray-600 w-10 text-right">
                            {data.ratingDistribution[stars]}%
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowAllRatings(true)}
                        className="mt-2 text-sm font-medium text-pink-600 hover:text-pink-700 flex items-center gap-1"
                      >
                        View all ratings <ChevronDown className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="grid grid-cols-[auto_1fr_auto] gap-2.5 items-center">
                          <span className="text-sm font-medium text-gray-700 w-14">{stars} star{stars !== 1 ? 's' : ''}</span>
                          <Progress
                            value={data.ratingDistribution[stars]}
                            className="h-2"
                          />
                          <span className="text-sm font-medium text-gray-600 w-10 text-right">
                            {data.ratingDistribution[stars]}%
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowAllRatings(false)}
                        className="mt-2 text-sm font-medium text-pink-600 hover:text-pink-700 flex items-center gap-1"
                      >
                        Show less <ChevronUp className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Products Section */}
      {suggestedProducts && suggestedProducts.docs.length > 0 && (
        <div className="mt-12 max-w-7xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {suggestedProducts.docs.map((product, index) => {
              // Build gallery array from product data
              const gallery: Array<{ url: string; alt: string }> = [];
              
              // Type assertion for gallery field
              const productWithGallery = product as any;
              if (productWithGallery.gallery && Array.isArray(productWithGallery.gallery)) {
                productWithGallery.gallery.forEach((item: any) => {
                  if (item.media && typeof item.media === 'object' && item.media.url) {
                    gallery.push({
                      url: item.media.url,
                      alt: item.media.alt || product.name,
                    });
                  }
                });
              }

              return (
                <SuggestedProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  imageUrl={product.image?.url}
                  gallery={gallery.length > 0 ? gallery : null}
                  tenantSlug={product.tenant?.slug || tenantSlug}
                  price={product.price}
                  priority={index < 2}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Loading state for suggested products */}
      {isLoadingSuggested && (
        <div className="mt-12 max-w-7xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <SuggestedProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      )}
      
      {/* Image Lightbox */}
      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
};

export const ProductViewSkeleton = () => {
  return (
    <div className="px-4 lg:px-12 py-10">
      <div className="border rounded-sm bg-white overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          
          {/* LEFT SIDE - Image Skeleton (Desktop: left, Mobile: top) */}
          <div className="order-1 lg:order-1 lg:border-r">
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

          {/* RIGHT SIDE - Product Details Skeleton (Desktop: right, Mobile: bottom) */}
          <div className="order-2 lg:order-2 border-t lg:border-t-0">
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
        </div>
      </div>
    </div>
  );
}