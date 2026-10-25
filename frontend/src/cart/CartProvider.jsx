import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/authContext.js';
import { storage } from '../lib/storage.js';
import { CartContext } from './cartContext.js';

// The cart lives on the phone (one per account), so it survives restarts and weak signal. It holds
// what the buyer saw (price, names) only for display: checkout re-checks everything on the server.
const keyFor = (userId) => `agc.cart.${userId}`;

function loadCart(userId) {
  if (!userId) return [];
  try {
    const saved = JSON.parse(storage.get(keyFor(userId)) ?? '[]');
    return Array.isArray(saved) ? saved.filter((item) => item?.productId && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [cart, setCart] = useState(() => ({ owner: userId, items: loadCart(userId) }));

  // Another account logged in on this phone: show that account's cart.
  if (cart.owner !== userId) setCart({ owner: userId, items: loadCart(userId) });

  useEffect(() => {
    if (cart.owner) storage.set(keyFor(cart.owner), JSON.stringify(cart.items));
  }, [cart]);

  const update = useCallback(
    (change) => setCart((current) => ({ ...current, items: change(current.items) })),
    [],
  );

  const value = useMemo(
    () => ({
      items: cart.items,
      count: cart.items.length,
      add: (item) =>
        update((items) => {
          const existing = items.find((i) => i.productId === item.productId);
          return existing
            ? items.map((i) =>
                i.productId === item.productId
                  ? { ...item, quantity: i.quantity + item.quantity }
                  : i,
              )
            : [...items, item];
        }),
      setQuantity: (productId, quantity) =>
        update((items) =>
          quantity > 0
            ? items.map((i) => (i.productId === productId ? { ...i, quantity } : i))
            : items.filter((i) => i.productId !== productId),
        ),
      // Take the server's quote as the truth: current prices, what is left, what is gone.
      syncWithQuote: (quote) =>
        update((items) => {
          const lines = new Map(
            quote.groups.flatMap((g) => g.items).map((line) => [line.productId, line]),
          );
          return items
            .filter((i) => lines.has(i.productId))
            .map((i) => {
              const line = lines.get(i.productId);
              return { ...i, quantity: line.quantity, pricePerUnit: line.pricePerUnit };
            });
        }),
      remove: (productId) => update((items) => items.filter((i) => i.productId !== productId)),
      clear: () => update(() => []),
    }),
    [cart.items, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
