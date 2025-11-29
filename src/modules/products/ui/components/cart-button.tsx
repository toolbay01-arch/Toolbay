"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "@/components/quantity-selector";

import { useCart } from "@/modules/checkout/hooks/use-cart";

interface Props {
  tenantSlug: string;
  productId: string;
  isPurchased?: boolean;
  quantity?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  unit?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock" | "pre_order";
  allowBackorder?: boolean;
};

export const CartButton = ({ 
  tenantSlug, 
  productId, 
  isPurchased,
  quantity = 0,
  minOrderQuantity = 1,
  maxOrderQuantity,
  unit = "unit",
  stockStatus = "in_stock",
  allowBackorder = false,
}: Props) => {
  const cart = useCart(tenantSlug);
  const isInCart = cart.isProductInCart(productId);
  const cartQuantity = cart.getItemQuantity(productId);
  const [selectedQuantity, setSelectedQuantity] = useState(minOrderQuantity);

  // Determine if product is available for purchase
  const isOutOfStock = stockStatus === "out_of_stock" && !allowBackorder;
  const canPurchase = quantity > 0 || allowBackorder;
  
  // Calculate max quantity that can be added
  const maxAllowedQuantity = maxOrderQuantity 
    ? Math.min(maxOrderQuantity, quantity)
    : quantity;

  if (isOutOfStock) {
    return (
      <Button
        variant="elevated"
        disabled
        className="flex-1 bg-gray-300"
      >
        Out of Stock
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {!isInCart ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Quantity:</span>
            <QuantitySelector
              value={selectedQuantity}
              onChange={setSelectedQuantity}
              min={minOrderQuantity}
              max={maxAllowedQuantity || undefined}
              unit={unit}
              size="md"
            />
          </div>
          <Button
            variant="elevated"
            className="w-full bg-pink-400"
            onClick={() => cart.addProduct(productId, selectedQuantity)}
            disabled={!canPurchase}
          >
            Add to Cart
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">In cart:</span>
            <QuantitySelector
              value={cartQuantity}
              onChange={(newQuantity) => cart.updateQuantity(productId, newQuantity)}
              min={minOrderQuantity}
              max={maxAllowedQuantity || undefined}
              unit={unit}
              size="md"
            />
          </div>
          <Button
            variant="elevated"
            className="w-full bg-white"
            onClick={() => cart.removeProduct(productId)}
          >
            Remove from Cart
          </Button>
        </>
      )}
      
      {stockStatus === "low_stock" && (
        <p className="text-xs text-orange-600 text-center">
          Only {quantity} {unit}{quantity !== 1 ? "s" : ""} left in stock
        </p>
      )}
      {stockStatus === "pre_order" && (
        <p className="text-xs text-blue-600 text-center">
          This item is available for pre-order
        </p>
      )}
      
      {/* Show "View in Library" link if product is already purchased, but allow re-purchasing */}
      {isPurchased && (
        <Button
          variant="outline"
          asChild
          className="w-full text-sm"
        >
          <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/library/${productId}`}>
            View in Library
          </Link>
        </Button>
      )}
    </div>
  );
};
