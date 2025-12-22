import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface CartItem {
  productId: string;
  quantity: number;
}

interface TenantCart {
  items: CartItem[];
};

interface CartState {
  tenantCarts: Record<string, TenantCart>;
  addProduct: (tenantSlug: string, productId: string, quantity?: number) => void;
  removeProduct: (tenantSlug: string, productId: string) => void;
  updateQuantity: (tenantSlug: string, productId: string, quantity: number) => void;
  incrementQuantity: (tenantSlug: string, productId: string) => void;
  decrementQuantity: (tenantSlug: string, productId: string) => void;
  getProductQuantity: (tenantSlug: string, productId: string) => number;
  clearCart: (tenantSlug: string) => void;
  clearAllCarts: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tenantCarts: {},
      addProduct: (tenantSlug, productId, quantity = 1) => 
        set((state) => {
          const existingCart = state.tenantCarts[tenantSlug];
          const existingItem = existingCart?.items?.find(item => item.productId === productId);
          
          if (existingItem && existingCart) {
            // Update existing item quantity
            return {
              tenantCarts: {
                ...state.tenantCarts,
                [tenantSlug]: {
                  items: existingCart.items.map(item =>
                    item.productId === productId
                      ? { ...item, quantity: item.quantity + quantity }
                      : item
                  )
                }
              }
            };
          } else {
            // Add new item
            return {
              tenantCarts: {
                ...state.tenantCarts,
                [tenantSlug]: {
                  items: [
                    ...(existingCart?.items || []),
                    { productId, quantity }
                  ]
                }
              }
            };
          }
        }),
      removeProduct: (tenantSlug, productId) => 
        set((state) => {
          const existingCart = state.tenantCarts[tenantSlug];
          return {
            tenantCarts: {
              ...state.tenantCarts,
              [tenantSlug]: {
                items: existingCart?.items.filter(
                  (item) => item.productId !== productId
                ) || [],
              }
            }
          };
        }),
      updateQuantity: (tenantSlug, productId, quantity) =>
        set((state) => {
          const existingCart = state.tenantCarts[tenantSlug];
          if (!existingCart || !existingCart.items) {
            // Initialize cart if it doesn't exist
            return {
              tenantCarts: {
                ...state.tenantCarts,
                [tenantSlug]: {
                  items: quantity > 0 ? [{ productId, quantity }] : []
                }
              }
            };
          }
          
          // If quantity is 0 or less, remove the item
          if (quantity <= 0) {
            return {
              tenantCarts: {
                ...state.tenantCarts,
                [tenantSlug]: {
                  items: existingCart.items.filter(item => item.productId !== productId)
                }
              }
            };
          }
          
          const itemExists = existingCart.items.some(item => item.productId === productId);
          
          return {
            tenantCarts: {
              ...state.tenantCarts,
              [tenantSlug]: {
                items: itemExists
                  ? existingCart.items.map(item =>
                      item.productId === productId
                        ? { ...item, quantity }
                        : item
                    )
                  : [...existingCart.items, { productId, quantity }]
              }
            }
          };
        }),
      incrementQuantity: (tenantSlug, productId) =>
        set((state) => {
          const existingCart = state.tenantCarts[tenantSlug];
          if (!existingCart || !existingCart.items) {
            // Initialize cart with quantity 1 if it doesn't exist
            return {
              tenantCarts: {
                ...state.tenantCarts,
                [tenantSlug]: {
                  items: [{ productId, quantity: 1 }]
                }
              }
            };
          }
          
          const itemExists = existingCart.items.some(item => item.productId === productId);
          
          return {
            tenantCarts: {
              ...state.tenantCarts,
              [tenantSlug]: {
                items: itemExists
                  ? existingCart.items.map(item =>
                      item.productId === productId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                    )
                  : [...existingCart.items, { productId, quantity: 1 }]
              }
            }
          };
        }),
      decrementQuantity: (tenantSlug, productId) =>
        set((state) => {
          const existingCart = state.tenantCarts[tenantSlug];
          if (!existingCart || !existingCart.items) return state;
          
          return {
            tenantCarts: {
              ...state.tenantCarts,
              [tenantSlug]: {
                items: existingCart.items.map(item =>
                  item.productId === productId && item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
                ).filter(item => item.quantity > 0)
              }
            }
          };
        }),
      getProductQuantity: (tenantSlug, productId) => {
        const state = get();
        const cart = state.tenantCarts[tenantSlug];
        if (!cart || !cart.items) return 0;
        const item = cart.items.find(item => item.productId === productId);
        return item?.quantity || 0;
      },
      clearCart: (tenantSlug) => 
        set((state) => ({
          tenantCarts: {
            ...state.tenantCarts,
            [tenantSlug]: {
              items: [],
            },
          },
        })),
      clearAllCarts: () => 
        set({
          tenantCarts: {},
        }),
    }),
    {
      name: "toolbay-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
