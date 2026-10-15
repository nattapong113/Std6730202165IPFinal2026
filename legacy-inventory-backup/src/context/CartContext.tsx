import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: number;
  name: string;
  image?: string;
  price: number;
  stock: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any, quantity: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  getCartQuantity: (id: number) => number;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // ล้างตะกร้าทุกครั้งที่ออกจากระบบ กันตะกร้าของคนก่อนหน้าค้างอยู่
  useEffect(() => {
    if (!token) setItems([]);
  }, [token]);

  const addToCart = (product: any, quantity: number) => {
    const stock = Number(product.stock || 0);

    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);

      if (existing) {
        const newQuantity = Math.min(existing.quantity + quantity, stock);
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: newQuantity } : i));
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          image: product.image,
          price: Number(product.price || 0),
          stock,
          quantity: Math.min(quantity, stock),
        },
      ];
    });
  };

  const updateQuantity = (id: number, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(Math.min(quantity, i.stock), 0) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => setItems([]);

  const getCartQuantity = (id: number) => items.find((i) => i.id === id)?.quantity || 0;

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, updateQuantity, removeFromCart, clearCart, getCartQuantity, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
