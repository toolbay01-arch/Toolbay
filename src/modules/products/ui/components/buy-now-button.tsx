"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { BuyNowDialog, CheckoutData } from "./buy-now-dialog";

interface BuyNowButtonProps {
  tenantSlug: string;
  productId: string;
  productName: string;
  productPrice: number;
  isPurchased?: boolean;
  quantity?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  unit?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock" | "pre_order";
  allowBackorder?: boolean;
}

export const BuyNowButton = ({
  tenantSlug,
  productId,
  productName,
  productPrice,
  isPurchased,
  quantity = 0,
  minOrderQuantity = 1,
  maxOrderQuantity,
  unit = "unit",
  stockStatus = "in_stock",
  allowBackorder = false,
}: BuyNowButtonProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Determine if product is available for purchase
  const isOutOfStock = stockStatus === "out_of_stock" && !allowBackorder;
  const canPurchase = quantity > 0 || allowBackorder;

  // Calculate max quantity that can be added
  const maxAllowedQuantity = maxOrderQuantity
    ? Math.min(maxOrderQuantity, quantity)
    : quantity;

  const buyNowMutation = useMutation(
    trpc.checkout.initiatePayment.mutationOptions({
      onSuccess: (data) => {
        setDialogOpen(false);
        // Redirect to payment instructions page
        router.push(`/payment/instructions?transactionId=${data.transactionId}`);
      },
      onError: (error) => {
        if (error.data?.code === "UNAUTHORIZED") {
          // Redirect to sign in
          setDialogOpen(false);
          toast.error("Please sign in to continue");
          router.push(`/sign-in?redirect=/tenants/${tenantSlug}/products/${productId}`);
        } else {
          toast.error(error.message);
        }
      },
    })
  );

  const handleBuyNow = () => {
    setDialogOpen(true);
  };

  const handleCheckoutSubmit = (data: CheckoutData) => {
    // Initiate payment with the quantity from the form
    buyNowMutation.mutate({
      tenantSlug,
      items: [
        {
          productId,
          quantity: data.quantity,
        },
      ],
      customerName: data.name,
      customerPhone: data.phone,
      customerEmail: data.email,
      shippingAddress: {
        line1: data.addressLine1,
        city: data.city,
        country: data.country,
      },
    });
  };

  if (isPurchased) {
    return null; // Don't show Buy Now for already purchased items
  }

  if (isOutOfStock) {
    return null; // Don't show Buy Now for out of stock items
  }

  return (
    <>
      <Button
        variant="elevated"
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        onClick={handleBuyNow}
        disabled={!canPurchase}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Buy Now
      </Button>

      <BuyNowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCheckoutSubmit}
        isLoading={buyNowMutation.isPending}
        productName={productName}
        productPrice={productPrice}
        minOrderQuantity={minOrderQuantity}
        maxOrderQuantity={maxAllowedQuantity}
        unit={unit}
      />
    </>
  );
};
