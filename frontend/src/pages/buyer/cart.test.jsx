import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import { renderApp, sampleProfiles, signedInHandlers, testUsers } from '../../test/helpers.jsx';

const tomato = { slug: 'tomato', names: { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' }, icon: '🍅' };
const farmer = { id: 'f1', firstName: 'Ramu', village: 'Kankipadu' };
const CART_KEY = `agc.cart.${testUsers.buyer.id}`;

const product = {
  id: 'p1',
  crop: { ...tomato, quantityStep: 1 },
  pricePerUnit: 3000,
  unit: 'kg',
  availableQuantity: 20,
  status: 'available',
  harvestDate: '2026-10-25T05:00:00Z',
  photoUrl: null,
  photos: [],
  distanceKm: 3,
  farmer,
  nextDeliveryDate: '2026-10-28',
  deliveryFee: 2000,
  minOrderValue: 5000,
  canDeliver: true,
  deliveryDays: ['mon', 'wed'],
  cutoffTime: '18:00',
};

function quoteFor(items, { changes = [], minOrderValue = 5000, pricePerUnit = 3000 } = {}) {
  const lines = items.map((i) => ({
    productId: i.productId,
    crop: tomato,
    unit: 'kg',
    quantity: i.quantity,
    pricePerUnit,
    lineTotal: i.quantity * pricePerUnit,
    availableQuantity: 20,
    quantityStep: 1,
  }));
  const itemsTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return {
    address: {
      id: 'a1',
      label: 'Home',
      landmark: 'Temple',
      area: 'Benz Circle',
      pincode: '520010',
    },
    groups: [
      {
        farmer,
        items: lines,
        priceBreakdown: {
          itemsTotal,
          deliveryFee: 2000,
          platformFee: 0,
          buyerTotal: itemsTotal + 2000,
          farmerEarnings: itemsTotal + 2000,
        },
        minOrderValue,
        meetsMinimum: itemsTotal >= minOrderValue,
        deliveryDates: ['2026-10-28', '2026-11-02'],
      },
    ],
    totals: { itemsTotal, deliveryFee: 2000, buyerTotal: itemsTotal + 2000 },
    changes,
  };
}

const placedOrder = {
  id: 'o1',
  checkoutGroupId: 'g1',
  status: 'placed',
  farmer,
  items: [
    {
      productId: 'p1',
      cropName: tomato.names,
      unit: 'kg',
      quantity: 3,
      pricePerUnit: 3000,
      lineTotal: 9000,
    },
  ],
  delivery: { date: '2026-11-02', fee: 2000, address: { landmark: 'Temple', pincode: '520010' } },
  priceBreakdown: { itemsTotal: 9000, deliveryFee: 2000, platformFee: 0, buyerTotal: 11000 },
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  statusHistory: [],
  canCancel: true,
};

function buyerApp(path, routes) {
  const base = signedInHandlers(testUsers.buyer, { profile: sampleProfiles.buyer });
  const handlers = new Proxy(base, {
    get(target, key) {
      if (typeof key !== 'string') return target[key];
      return routes[key.split('?')[0]] ?? target[key];
    },
  });
  return { user: userEvent.setup(), ...renderApp(path, handlers) };
}

const cartLine = (overrides = {}) => ({
  productId: 'p1',
  quantity: 3,
  pricePerUnit: 3000,
  unit: 'kg',
  cropNames: tomato.names,
  icon: '🍅',
  quantityStep: 1,
  farmer,
  ...overrides,
});

beforeEach(async () => {
  localStorage.clear();
  await changeLanguage('en');
});

describe('Cart and checkout', () => {
  it('adds to cart, shows the breakdown per farmer and places a cash-on-delivery order', async () => {
    let orders = [];
    const { user, calls, router } = buyerApp('/buyer/products/p1', {
      'GET /market/products/p1': () => [200, { product }],
      'POST /checkout/quote': (request) => [200, quoteFor(request.body.items)],
      'POST /checkout': (request) => {
        orders = [placedOrder];
        return [201, { checkoutGroupId: request.body.idempotencyKey, orders, replayed: false }];
      },
      'GET /orders/mine': () => [200, { items: orders, page: 1, limit: 20, total: orders.length }],
    });

    await user.click(await screen.findByRole('button', { name: /Increase How much/ }));
    await user.click(screen.getByRole('button', { name: /Increase How much/ }));
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(screen.getByText('3 kg in your cart')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Go to cart' }));

    const group = await screen.findByRole('region', { name: 'From Ramu, Kankipadu' });
    expect(within(group).getAllByText('₹90')).toHaveLength(2);
    await user.click(within(group).getByRole('radio', { name: /2 Nov/ }));
    // Farmer total and the grand total: items plus the ₹20 delivery fee.
    expect(screen.getAllByText('₹110')).toHaveLength(2);
    expect(screen.getByText('Cash on delivery')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/buyer/orders'));
    const sent = calls.find((c) => c.key === 'POST /checkout').body;
    expect(sent).toMatchObject({
      paymentMethod: 'cod',
      items: [{ productId: 'p1', quantity: 3, pricePerUnit: 3000 }],
      deliveryDates: { f1: '2026-11-02' },
    });
    expect(sent.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByText('Waiting for farmer')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CART_KEY))).toEqual([]);
  });

  it('shows exactly what changed when the server rejects the cart, then updates it', async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([cartLine()]));
    let priceRose = false;
    const { user, calls } = buyerApp('/buyer/cart', {
      'POST /checkout/quote': (request) => {
        const sentPrice = request.body.items[0].pricePerUnit;
        const changes =
          priceRose && sentPrice === 3000
            ? [{ productId: 'p1', kind: 'price', old: 3000, new: 3500 }]
            : [];
        return [
          200,
          quoteFor(request.body.items, { changes, pricePerUnit: priceRose ? 3500 : 3000 }),
        ];
      },
      'POST /checkout': () => {
        priceRose = true;
        return [409, { error: { code: 'CART_CHANGED', message: 'Changed' } }];
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Place order' }));

    expect(await screen.findByText('Tomato: price is now ₹35 (was ₹30).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'OK, update my cart' }));

    await waitFor(() => expect(screen.queryByText(/price is now/)).not.toBeInTheDocument());
    expect(calls.filter((c) => c.key === 'POST /checkout/quote').at(-1).body.items[0]).toEqual({
      productId: 'p1',
      quantity: 3,
      pricePerUnit: 3500,
    });
    expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled();
  });

  it("explains a farmer's minimum order and the new-buyer cash limit", async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([cartLine({ quantity: 1 })]));
    const { user } = buyerApp('/buyer/cart', {
      'POST /checkout/quote': (request) => [
        200,
        quoteFor(request.body.items, { minOrderValue: 10000 }),
      ],
      'POST /checkout': () => [
        409,
        { error: { code: 'COD_LIMIT', message: 'Too big', details: { limit: 50000 } } },
      ],
    });

    expect(
      await screen.findByText('Add ₹70 more: this farmer’s minimum order is ₹100.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Increase Tomato/ }));
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: /Increase Tomato/ }));
    }
    await waitFor(() => expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Place order' }));

    expect(
      await screen.findByText(
        'New buyers can pay cash for orders up to ₹500. Make the order smaller.',
      ),
    ).toBeInTheDocument();
  });

  it('shows an empty cart with a way back to produce', async () => {
    buyerApp('/buyer/cart', {});
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See produce' })).toHaveAttribute('href', '/buyer');
  });
});

describe('My orders', () => {
  it('cancels a placed order after confirming', async () => {
    let order = placedOrder;
    const { user, calls } = buyerApp('/buyer/orders', {
      'GET /orders/mine': () => [200, { items: [order], page: 1, limit: 20, total: 1 }],
      'POST /orders/o1/cancel': () => {
        order = { ...placedOrder, status: 'cancelled', canCancel: false };
        return [200, { order }];
      },
    });

    expect(await screen.findByText('Tomato · 3 kg')).toBeInTheDocument();
    expect(screen.getByText('Total ₹110 · Cash on delivery')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel order' }));
    expect(calls.some((c) => c.key === 'POST /orders/o1/cancel')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(await screen.findByText('Order cancelled.')).toBeInTheDocument();
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  });
});
