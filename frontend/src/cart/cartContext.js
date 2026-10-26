import { createContext, useContext } from 'react';

export const CartContext = createContext(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}

// A cart line from a marketplace product (card or detail shape).
export function toCartItem(product, quantity) {
  return {
    productId: product.id,
    quantity,
    pricePerUnit: product.pricePerUnit,
    unit: product.unit,
    cropNames: product.crop?.names,
    cropSlug: product.crop?.slug,
    quantityStep: product.crop?.quantityStep ?? 1,
    photoUrl: product.photoUrl ?? null,
    farmer: product.farmer,
  };
}
