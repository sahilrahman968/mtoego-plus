"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  clearCart as apiClearCart,
  applyCoupon as apiApplyCoupon,
  removeCoupon as apiRemoveCoupon,
  type CartData,
  type CartItemData,
} from "@/lib/store-api";
import { useAuth } from "./AuthContext";

interface CartContextType {
  cart: CartData | null;
  items: CartItemData[];
  itemCount: number;
  isLoading: boolean;
  addToCart: (productId: string, variantId: string, quantity: number) => Promise<{ success: boolean; message: string }>;
  updateItem: (itemId: string, quantity: number) => Promise<{ success: boolean; message: string }>;
  removeItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => Promise<{ success: boolean; message: string }>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await getCart();
      if (res.success && res.data) {
        setCart(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      refresh();
    }
  }, [authLoading, refresh]);

  const addToCart = useCallback(
    async (productId: string, variantId: string, quantity: number) => {
      try {
        const res = await apiAddToCart(productId, variantId, quantity);
        if (res.success && res.data) {
          setCart(res.data);
          return { success: true, message: res.message };
        }
        return { success: false, message: res.message || "Failed to add to cart" };
      } catch {
        return { success: false, message: "Failed to add to cart" };
      }
    },
    []
  );

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    try {
      const res = await apiUpdateCartItem(itemId, quantity);
      if (res.success && res.data) {
        setCart(res.data);
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || "Failed to update item" };
    } catch {
      return { success: false, message: "Failed to update item" };
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      const res = await apiRemoveCartItem(itemId);
      if (res.success && res.data) {
        setCart(res.data);
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || "Failed to remove item" };
    } catch {
      return { success: false, message: "Failed to remove item" };
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      await apiClearCart();
      setCart(null);
    } catch {
      // silently fail
    }
  }, []);

  const applyCouponFn = useCallback(async (code: string) => {
    try {
      const res = await apiApplyCoupon(code);
      if (res.success) {
        await refresh();
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || "Failed to apply coupon" };
    } catch {
      return { success: false, message: "Failed to apply coupon" };
    }
  }, [refresh]);

  const removeCouponFn = useCallback(async () => {
    try {
      const res = await apiRemoveCoupon();
      if (res.success) {
        await refresh();
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || "Failed to remove coupon" };
    } catch {
      return { success: false, message: "Failed to remove coupon" };
    }
  }, [refresh]);

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        items,
        itemCount,
        isLoading,
        addToCart,
        updateItem,
        removeItem,
        clear,
        applyCoupon: applyCouponFn,
        removeCoupon: removeCouponFn,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
