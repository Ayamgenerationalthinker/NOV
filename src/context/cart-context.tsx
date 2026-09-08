'use client';

import * as React from 'react';

export interface CartItem {
  productId: string;
  title: string;
  slug: string;
  price: number;
  discountPrice?: number | null;
  coverImage?: string | null;
  productType: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  itemCount: number;
  subtotal: number;
  isLoaded: boolean;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'nov_shopping_cart';

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

  const addItem = React.useCallback((newItem: CartItem) => {
    setItems((prev) => {
      // Digital products: avoid duplicate items in cart
      if (prev.some((item) => item.productId === newItem.productId)) {
        return prev;
      }
      return [...prev, newItem];
    });
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = React.useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items]
  );

  const itemCount = items.length;

  const subtotal = React.useMemo(() => {
    const sum = items.reduce((acc, item) => {
      const activePrice =
        item.discountPrice !== undefined && item.discountPrice !== null && item.discountPrice < item.price
          ? item.discountPrice
          : item.price;
      return acc + activePrice;
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        isInCart,
        itemCount,
        subtotal,
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
