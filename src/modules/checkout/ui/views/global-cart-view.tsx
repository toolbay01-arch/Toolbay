"use client";

import { InboxIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCartStore } from "../../store/use-cart-store";
import { generateTenantURL } from "@/lib/utils";

export const GlobalCartView = () => {
  const router = useRouter();
  const tenantCarts = useCartStore((state) => state.tenantCarts);
  
  // Calculate total items across all tenants - handle undefined during hydration
  const totalItems = tenantCarts 
    ? Object.values(tenantCarts).reduce((total, cart) => {
        return total + (cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0);
      }, 0)
    : 0;

  // Get list of tenants with items
  const tenantsWithItems = tenantCarts 
    ? Object.entries(tenantCarts).filter(
        ([_, cart]) => cart?.items && cart.items.length > 0
      )
    : [];

  if (totalItems === 0) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-12 flex-col gap-y-4">
            <InboxIcon className="w-16 h-16 text-muted-foreground" />
            <p className="text-xl font-medium">Your cart is empty</p>
            <p className="text-muted-foreground">Add some products to get started</p>
            <Button 
              onClick={() => router.push("/")}
              className="mt-4"
            >
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="lg:pt-16 pt-4 px-4 lg:px-12 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
        <p className="text-muted-foreground">
          {totalItems} {totalItems === 1 ? 'item' : 'items'} across {tenantsWithItems.length} {tenantsWithItems.length === 1 ? 'store' : 'stores'}
        </p>
      </div>

      <div className="space-y-6">
        {tenantsWithItems.map(([tenantSlug, cart]) => {
          const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
          
          return (
            <Card key={tenantSlug} className="border-2 border-black">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold capitalize">{tenantSlug}</h2>
                    <p className="text-sm text-muted-foreground">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push(`${generateTenantURL(tenantSlug)}/cart`)}
                    className="bg-pink-400 hover:bg-pink-500"
                  >
                    View Cart
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {cart.items.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm py-2 border-t">
                      <span className="text-muted-foreground">Product ID: {item.productId.slice(0, 8)}...</span>
                      <span className="font-medium">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => router.push(`${generateTenantURL(tenantSlug)}/checkout`)}
                  variant="outline"
                  className="w-full mt-4"
                >
                  Checkout from {tenantSlug}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={() => router.push("/")}
          variant="outline"
          size="lg"
        >
          Continue Shopping
        </Button>
      </div>
    </div>
  );
};
