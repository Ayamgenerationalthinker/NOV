'use client';

import * as React from 'react';
import { ProductKind } from '@prisma/client';

export interface CartItem {
  id: string; // unique item key e.g. `${productId}-${variantId || 'default'}`
  productId: string;
  variantId?: string | null;
  variantTitle?: string | null;
  sku?: string | null;
  productKind: ProductKind;
  title: string;
  slug: string;
  price: number;
  discountPrice?: number | null;
  coverImage?: string | null;
  productType: string;
  quantity: number;
  weightGrams?: number | null;
  currency?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'> & { id?: string; quantity?: number }) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  isInCart: (productId: string, variantId?: string | null) => boolean;
  itemCount: number;
  subtotal: number;
  hasPhysicalItems: boolean;
  isLoaded: boolean;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'nov_hybrid_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load cart from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load cart from storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage on changes
  React.useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save cart to storage:', e);
      }
    }
  }, [items, isLoaded]);

  const addItem = React.useCallback(
    (newItem: Omit<CartItem, 'id' | 'quantity'> & { id?: string; quantity?: number }) => {
      const itemId = newItem.id || `${newItem.productId}-${newItem.variantId || 'default'}`;
      const quantityToAdd = newItem.quantity || 1;

      setItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === itemId);

        if (existingIndex > -1) {
          // Digital products remain quantity 1 to prevent double-buying
          if (newItem.productKind === ProductKind.DIGITAL) {
            return prev;
          }
          const updated = [...prev];
          updated[existingIndex].quantity += quantityToAdd;
          return updated;
        }

        return [
          ...prev,
          {
            ...newItem,
            id: itemId,
            quantity: quantityToAdd,
          },
        ];
      });
    },
    []
  );

  const updateQuantity = React.useCallback((itemId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.id !== itemId);
      }
      return prev.map((item) => (item.id === itemId ? { ...item, quantity } : item));
    });
  }, []);

  const removeItem = React.useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId && item.productId !== itemId));
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = React.useCallback(
    (productId: string, variantId?: string | null) => {
      const targetId = `${productId}-${variantId || 'default'}`;
      return items.some((item) => item.id === targetId || item.productId === productId);
    },
    [items]
  );

  const itemCount = React.useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const hasPhysicalItems = React.useMemo(
    () => items.some((item) => item.productKind === ProductKind.PHYSICAL),
    [items]
  );

  const subtotal = React.useMemo(() => {
    const sum = items.reduce((acc, item) => {
      const activePrice =
        item.discountPrice !== undefined && item.discountPrice !== null && item.discountPrice < item.price
          ? item.discountPrice
          : item.price;
      return acc + activePrice * item.quantity;
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        isInCart,
        itemCount,
        subtotal,
        hasPhysicalItems,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
