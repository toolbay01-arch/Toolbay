import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow"

import { useCartStore } from "../store/use-cart-store";

export const useCart = (tenantSlug: string) => {
  const addProduct = useCartStore((state) => state.addProduct);
  const removeProduct = useCartStore((state) => state.removeProduct);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const incrementQuantity = useCartStore((state) => state.incrementQuantity);
  const decrementQuantity = useCartStore((state) => state.decrementQuantity);
  const getProductQuantity = useCartStore((state) => state.getProductQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const clearAllCarts = useCartStore((state) => state.clearAllCarts);

  const cartItems = useCartStore(useShallow((state) => state.tenantCarts[tenantSlug]?.items || []));
  const productIds = cartItems.map(item => item.productId);

  const toggleProduct = useCallback((productId: string, quantity = 1) => {
    const existingQuantity = getProductQuantity(tenantSlug, productId);
    if (existingQuantity > 0) {
      removeProduct(tenantSlug, productId);
    } else {
      addProduct(tenantSlug, productId, quantity);
    }
  }, [addProduct, removeProduct, getProductQuantity, tenantSlug]);

  const isProductInCart = useCallback((productId: string) => {
    return getProductQuantity(tenantSlug, productId) > 0;
  }, [getProductQuantity, tenantSlug]);

  const clearTenantCart = useCallback(() => {
    clearCart(tenantSlug);
  }, [tenantSlug, clearCart]);

  const handleAddProduct = useCallback((productId: string, quantity = 1) => {
    addProduct(tenantSlug, productId, quantity);
  }, [addProduct, tenantSlug]);

  const handleRemoveProduct = useCallback((productId: string) => {
    removeProduct(tenantSlug, productId);
  }, [removeProduct, tenantSlug]);

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    updateQuantity(tenantSlug, productId, quantity);
  }, [updateQuantity, tenantSlug]);

  const handleIncrementQuantity = useCallback((productId: string) => {
    incrementQuantity(tenantSlug, productId);
  }, [incrementQuantity, tenantSlug]);

  const handleDecrementQuantity = useCallback((productId: string) => {
    decrementQuantity(tenantSlug, productId);
  }, [decrementQuantity, tenantSlug]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const getItemQuantity = useCallback((productId: string) => {
    return getProductQuantity(tenantSlug, productId);
  }, [getProductQuantity, tenantSlug]);

  return {
    productIds,
    cartItems,
    addProduct: handleAddProduct,
    removeProduct: handleRemoveProduct,
    updateQuantity: handleUpdateQuantity,
    incrementQuantity: handleIncrementQuantity,
    decrementQuantity: handleDecrementQuantity,
    clearCart: clearTenantCart,
    clearAllCarts,
    toggleProduct,
    isProductInCart,
    getItemQuantity,
    totalItems: getTotalItems(),
  };
};
