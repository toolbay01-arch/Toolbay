"use client";

import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InboxIcon, LoaderIcon, Trash2, Plus, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateTenantURL } from "@/lib/utils";

import { useCart } from "../../hooks/use-cart";

interface CartViewProps {
  tenantSlug: string;
}

export const CartView = ({ tenantSlug }: CartViewProps) => {
  const router = useRouter();
  const { 
    cartItems, 
    productIds, 
    clearCart, 
    removeProduct, 
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    totalItems 
  } = useCart(tenantSlug);
  
  const trpc = useTRPC();
  const { data, error, isLoading } = useQuery(trpc.checkout.getProducts.queryOptions({
    ids: productIds,
  }));

  useEffect(() => {
    if (error?.data?.code === "NOT_FOUND") {
      clearCart();
      toast.warning("Invalid products found, cart cleared");
    }
  }, [error, clearCart]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' RWF';
  };

  const totalAmount = cartItems.reduce((total, item) => {
    const product = data?.docs.find(p => p.id === item.productId);
    return total + ((product?.price || 0) * item.quantity);
  }, 0);

  const handleProceedToCheckout = () => {
    router.push(`${generateTenantURL(tenantSlug)}/checkout`);
  };

  if (isLoading) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border border-black border-dashed flex items-center justify-center p-8 flex-col gap-y-4 bg-white w-full rounded-lg">
          <LoaderIcon className="text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

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
              onClick={() => router.push(generateTenantURL(tenantSlug))}
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
          {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items - Left Side */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            const product = data?.docs.find(p => p.id === item.productId);
            
            if (!product) return null;

            const itemTotal = product.price * item.quantity;

            return (
              <Card key={item.productId}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product Image */}
                    {product.gallery && product.gallery.length > 0 && (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={
                            typeof product.gallery[0] === 'object' && 
                            typeof product.gallery[0].media === 'object'
                              ? product.gallery[0].media.url || ''
                              : ''
                          }
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-base sm:text-lg line-clamp-2 flex-1">
                          {product.name}
                        </h3>
                        {/* Item Total - Mobile (top right) */}
                        <p className="text-lg sm:hidden font-bold ml-2">
                          {formatCurrency(itemTotal)}
                        </p>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        Price: {formatCurrency(product.price)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => decrementQuantity(item.productId)}
                            disabled={item.quantity <= (product.minOrderQuantity || 1)}
                            className="h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-r-none"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-3 sm:px-4 py-1 min-w-[3rem] text-center font-medium border-x">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => incrementQuantity(item.productId)}
                            disabled={
                              product.maxOrderQuantity 
                                ? item.quantity >= product.maxOrderQuantity 
                                : item.quantity >= (product.quantity || 999)
                            }
                            className="h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-l-none"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeProduct(item.productId);
                            toast.success("Item removed from cart");
                          }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 sm:h-8"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>

                      {/* Stock Warning */}
                      {product.quantity && item.quantity > product.quantity && (
                        <p className="text-xs text-red-500 mt-2">
                          Only {product.quantity} items available
                        </p>
                      )}
                    </div>

                    {/* Item Total - Desktop (right side) */}
                    <div className="hidden sm:block text-right">
                      <p className="text-xl font-bold">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Clear Cart Button */}
          <Button
            variant="outline"
            onClick={() => {
              clearCart();
              toast.success("Cart cleared");
            }}
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cart
          </Button>
        </div>

        {/* Order Summary - Right Side */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">Calculated at checkout</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-lg font-bold">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>

                <Button
                  onClick={handleProceedToCheckout}
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  Proceed to Checkout
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  🔒 Secure payment via MTN Mobile Money
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => router.push(generateTenantURL(tenantSlug))}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
