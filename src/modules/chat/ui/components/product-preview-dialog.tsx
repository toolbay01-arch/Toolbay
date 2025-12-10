"use client";

import { ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductPreviewDialogProps {
  productUrl: string;
  open: boolean;
  onCloseAction: () => void;
}

// Extract product ID from URL
function extractProductId(url: string): string | null {
  if (!url) return null;
  // sanitize trailing punctuation
  const sanitized = url.replace(/[)\]\.\,;:!?]+$/g, '');
  const match = sanitized.match(/\/products\/([^\/\s?]+)/);
  return match?.[1] ?? null;
}

export function ProductPreviewDialog({
  productUrl,
  open,
  onCloseAction,
}: ProductPreviewDialogProps) {
  const productId = extractProductId(productUrl);
  const trpc = useTRPC();

  const { data: product, isLoading } = useQuery({
    ...trpc.products.getOne.queryOptions({ id: productId || "" }),
    enabled: open && !!productId,
  });

  const handleOpenFull = () => {
    window.location.href = productUrl;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCloseAction()}>
      <DialogContent className="max-w-[90vw] sm:max-w-md p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Product Preview</DialogTitle>
          <DialogDescription>
            View product details and information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="w-full aspect-square rounded-lg" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : product ? (
          <div className="relative">
            {/* Product Card - matching the design from screenshot */}
            <div className="border rounded-lg overflow-hidden">
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-50">
                {product.image && typeof product.image === "object" && product.image.url ? (
                  <Image
                    src={product.image.url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 90vw, 400px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                  {product.quantity > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 shrink-0">
                      In Stock
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-pink-600">
                    RWF {product.price?.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">per {product.unit || 'unit'}</span>
                </div>

                {product.tenant && typeof product.tenant === "object" && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{product.tenant.name}</span>
                    {product.tenant.verifiedAt && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={handleOpenFull}
                  className="w-full mt-4"
                  size="lg"
                >
                  View Full Details
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            Product not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
