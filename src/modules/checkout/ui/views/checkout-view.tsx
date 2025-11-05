"use client";

import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InboxIcon, LoaderIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

import { useCart } from "../../hooks/use-cart";
import { CheckoutForm, CheckoutFormData } from "../components/checkout-form";
import { useCheckoutStates } from "../../hooks/use-checkout-states";

interface CheckoutViewProps {
  tenantSlug: string;
}

export const CheckoutView = ({ tenantSlug }: CheckoutViewProps) => {
  const router = useRouter();
  const [states, setStates] = useCheckoutStates();
  const { cartItems, productIds, clearCart } = useCart(tenantSlug);
  
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery(trpc.checkout.getProducts.queryOptions({
    ids: productIds,
  }));

  const purchase = useMutation(trpc.checkout.initiatePayment.mutationOptions({
    onMutate: () => {
      setStates({ success: false, cancel: false });
    },
    onSuccess: (data) => {
      // Redirect to payment instructions page
      router.push(`/payment/instructions?transactionId=${data.transactionId}`);
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        // TODO: Modify when subdomains enabled
        router.push("/sign-in");
      }

      toast.error(error.message);
    },
  }));

  const handleCheckoutSubmit = (formData: CheckoutFormData) => {
    // Map cart items with quantities
    const items = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
    
    purchase.mutate({
      tenantSlug,
      items,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      customerName: formData.name,
      shippingAddress: {
        line1: formData.addressLine1,
        city: formData.city,
        country: formData.country,
      },
    });
  };

  useEffect(() => {
    if (states.success) {
      setStates({ success: false, cancel: false });
      clearCart();
      queryClient.invalidateQueries(trpc.library.getMany.infiniteQueryFilter());
      router.push("/library");
    }
  }, [
    states.success, 
    clearCart, 
    router, 
    setStates,
    queryClient,
    trpc.library.getMany,
  ]);
  
  useEffect(() => {
    if (error?.data?.code === "NOT_FOUND") {
      clearCart();
      toast.warning("Invalid products found, cart cleared");
    }
  }, [error, clearCart]);

  if (isLoading) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border border-black border-dashed flex items-center justify-center p-8 flex-col gap-y-4 bg-white w-full rounded-lg">
          <LoaderIcon className="text-muted-foreground animate-spin" />
        </div>
      </div>
    )
  }

  if (data?.totalDocs === 0) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border border-black border-dashed flex items-center justify-center p-8 flex-col gap-y-4 bg-white w-full rounded-lg">
          <InboxIcon />
          <p className="text-base font-medium">No products found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:pt-16 pt-4 px-4 lg:px-12 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground">
          Complete your order information below
        </p>
      </div>

      <CheckoutForm
        cartItems={cartItems.map(item => {
          const product = data?.docs.find(p => p.id === item.productId);
          return {
            id: item.productId,
            name: product?.name || "Unknown Product",
            price: product?.price || 0,
            quantity: item.quantity,
          };
        })}
        totalAmount={cartItems.reduce((total, item) => {
          const product = data?.docs.find(p => p.id === item.productId);
          return total + ((product?.price || 0) * item.quantity);
        }, 0)}
        onSubmitAction={handleCheckoutSubmit}
        isSubmitting={purchase.isPending}
      />

      {states.cancel && (
        <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Checkout failed. Please try again.</p>
        </div>
      )}
    </div>
  );
};
