import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import { renderApp, sampleProfiles, signedInHandlers, testUsers } from '../../test/helpers.jsx';

const tomato = {
  slug: 'tomato',
  names: { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' },
  image: '/crops/tomato.jpg',
};
const onion = {
  slug: 'onion',
  names: { en: 'Onion', te: 'ఉల్లిపాయ', hi: 'प्याज' },
  image: '/crops/onion.jpg',
};

const item = (n, overrides = {}) => ({
  id: `p${n}`,
  crop: tomato,
  pricePerUnit: 3000,
  unit: 'kg',
  availableQuantity: 20,
  status: 'available',
  harvestDate: '2026-10-25T05:00:00Z',
  photoUrl: null,
  distanceKm: 3,
  farmer: {
    id: 'f1',
    firstName: 'Ramu',
    village: 'Kankipadu',
    verificationLevel: 'phone_verified',
  },
  nextDeliveryDate: '2026-10-28',
  deliveryFee: 2000,
  minOrderValue: 10000,
  ...overrides,
});

const page = (items, { total = items.length, pageNumber = 1 } = {}) => [
  200,
  { items, page: pageNumber, limit: 20, total, sort: 'distance' },
];

// Answers "GET /market/..." for any query string; the query is checked from the recorded calls.
function buyerApp(path, { profile = sampleProfiles.buyer, routes = {} } = {}) {
  const base = signedInHandlers(testUsers.buyer, { profile });
  const handlers = new Proxy(base, {
    get(target, key) {
      if (typeof key !== 'string') return target[key];
      const prefix = Object.keys(routes).find((k) => key === k || key.startsWith(`${k}?`));
      return prefix ? routes[prefix] : target[key];
    },
  });
  return { user: userEvent.setup(), ...renderApp(path, handlers) };
}

const withAddress = {
  ...sampleProfiles.buyer,
  addresses: [
    {
      id: 'a1',
      label: 'Home',
      landmark: 'Temple',
      pincode: '520010',
      location: { latitude: 16.5062, longitude: 80.648 },
      isDefault: true,
    },
  ],
};

const searches = (calls) =>
  calls
    .filter((call) => call.key.startsWith('GET /market/products?'))
    .map((call) => Object.fromEntries(new URLSearchParams(call.key.split('?')[1])));

beforeEach(async () => {
  localStorage.clear();
  await changeLanguage('en');
});

describe('Buyer home', () => {
  it('uses the saved address, sorts nearest first and shows approximate distance', async () => {
    const { calls } = buyerApp('/buyer', {
      profile: withAddress,
      routes: {
        'GET /market/products': () =>
          page([
            item(1, { distanceKm: 0, rating: { average: 4.3, count: 28 } }),
            item(2, { crop: onion, distanceKm: 3, rating: { average: null, count: 0 } }),
          ]),
      },
    });

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Ramu · Under 1 km')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Ramu · 3 km away')).toBeInTheDocument();
    expect(within(cards[0]).getByText('₹30')).toBeInTheDocument();
    expect(within(cards[0]).getByText('/kg')).toBeInTheDocument();
    expect(within(cards[0]).getByLabelText('Rated 4.3 out of 5 by 28 buyers')).toBeVisible();
    expect(within(cards[1]).getByText('New')).toBeInTheDocument();
    // A real photo, never an emoji: the stock photo stands in when the farmer added none.
    expect(within(cards[1]).getByRole('img', { name: 'Onion' })).toHaveAttribute(
      'src',
      '/crops/onion.jpg',
    );
    expect(cards[0].closest('ul')).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4');
    expect(screen.getByText('Near your location')).toBeInTheDocument();
    expect(searches(calls)[0]).toEqual({
      lat: '16.5062',
      lng: '80.648',
      pincode: '520010',
      sort: 'distance',
      page: '1',
      limit: '20',
    });
  });

  it('adds one step to the cart from the card, and not when out of stock', async () => {
    localStorage.setItem('agc.buyerLocation', JSON.stringify({ lat: 16.5, lng: 80.6 }));
    const { user } = buyerApp('/buyer', {
      routes: {
        'GET /market/products': () =>
          page([
            item(1, { crop: { ...tomato, quantityStep: 0.5 } }),
            item(2, { crop: onion, status: 'out_of_stock' }),
          ]),
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Add Tomato to cart' }));
    expect(await screen.findByText('Added to cart.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('agc.cart.u2'))[0]).toMatchObject({
      productId: 'p1',
      quantity: 0.5,
    });
    expect(screen.getByRole('button', { name: 'Add Onion to cart' })).toBeDisabled();
  });

  it('asks where to deliver when nothing is known, then searches by pincode', async () => {
    const { user, calls } = buyerApp('/buyer', {
      routes: { 'GET /market/products': () => page([item(1, { distanceKm: null })]) },
    });

    const sheet = await screen.findByRole('dialog', { name: 'Where should we deliver?' });
    await user.type(within(sheet).getByLabelText('Or enter your pincode'), '50003');
    await user.click(within(sheet).getByRole('button', { name: 'Show produce' }));
    expect(within(sheet).getByText('Enter a 6-digit pincode.')).toBeInTheDocument();

    await user.type(within(sheet).getByLabelText('Or enter your pincode'), '2');
    await user.click(within(sheet).getByRole('button', { name: 'Show produce' }));

    expect(await screen.findByRole('link', { name: /Tomato/ })).toBeInTheDocument();
    expect(screen.getByText('Pincode 500032')).toBeInTheDocument();
    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
    // Without a location there is nothing to measure distance from.
    expect(screen.queryByRole('radio', { name: 'Nearest' })).not.toBeInTheDocument();
    expect(searches(calls)[0]).toMatchObject({ pincode: '500032', sort: 'freshness' });
    expect(JSON.parse(localStorage.getItem('agc.buyerLocation'))).toEqual({ pincode: '500032' });
  });

  it('searches, filters by category and price, and changes the sort', async () => {
    localStorage.setItem('agc.buyerLocation', JSON.stringify({ lat: 16.5, lng: 80.6 }));
    const { user, calls } = buyerApp('/buyer', {
      routes: { 'GET /market/products': () => page([item(1)]) },
    });
    await screen.findByRole('link', { name: /Tomato/ });

    await user.type(screen.getByLabelText('Search vegetables and fruits'), 'టమా');
    await waitFor(() => expect(searches(calls).at(-1)).toMatchObject({ q: 'టమా' }));

    await user.click(screen.getByRole('radio', { name: 'Fruits' }));
    await user.click(screen.getByRole('radio', { name: 'Price: low to high' }));
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    await user.type(within(sheet).getByLabelText('Highest price (₹)'), '40');
    await user.click(within(sheet).getByRole('radio', { name: 'Friday' }));
    await user.click(within(sheet).getByRole('button', { name: 'Show results' }));

    await waitFor(() =>
      expect(searches(calls).at(-1)).toMatchObject({
        q: 'టమా',
        category: 'fruit',
        sort: 'price',
        maxPrice: '4000',
        day: 'fri',
      }),
    );
    expect(screen.getByRole('button', { name: 'Filters (2)' })).toBeInTheDocument();
  });

  it('loads 20 at a time with Show more', async () => {
    localStorage.setItem('agc.buyerLocation', JSON.stringify({ lat: 16.5, lng: 80.6 }));
    const first = Array.from({ length: 20 }, (_, i) => item(i + 1));
    const { user } = buyerApp('/buyer', {
      routes: {
        'GET /market/products': (request, calls) =>
          calls.at(-1).key.includes('page=2')
            ? page([item(21, { crop: onion })], { total: 21, pageNumber: 2 })
            : page(first, { total: 21 }),
      },
    });

    expect(await screen.findByText('Showing 20 of 21')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByText('Showing 21 of 21')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Onion/ })).toBeInTheDocument();
    expect(screen.getByText('That is everything near you.')).toBeInTheDocument();
  });

  it('explains when no farmer delivers here, in Telugu', async () => {
    await changeLanguage('te');
    localStorage.setItem('agc.buyerLocation', JSON.stringify({ pincode: '999999' }));
    buyerApp('/buyer', { routes: { 'GET /market/products': () => page([]) } });

    expect(await screen.findByText('ఇక్కడ ఇంకా ఏమీ లేవు')).toBeInTheDocument();
  });
});

describe('Product and farmer pages', () => {
  const detail = {
    ...item(1),
    photos: [{ url: '/uploads/a.jpg', thumbnailUrl: '/uploads/a-thumb.webp' }],
    canDeliver: false,
    deliveryDays: ['mon', 'fri'],
    cutoffTime: '18:00',
  };

  it('shows the listing, delivery terms and a warning when the farmer cannot deliver', async () => {
    localStorage.setItem('agc.buyerLocation', JSON.stringify({ lat: 16.5, lng: 80.6 }));
    const { user, calls, router } = buyerApp('/buyer/products/p1', {
      routes: {
        'GET /market/products/p1': () => [200, { product: detail }],
        'GET /market/farmers/f1/reviews': () => [
          200,
          {
            items: [
              {
                id: 'r1',
                stars: 5,
                comment: 'Very fresh',
                buyerFirstName: 'Padma',
                createdAt: '2026-10-20T00:00:00Z',
              },
            ],
            total: 1,
          },
        ],
        'GET /market/farmers/f1': () => [
          200,
          {
            farmer: {
              ...detail.farmer,
              mandal: 'Kankipadu',
              district: 'Krishna',
              deliveryDays: ['mon', 'fri'],
              cutoffTime: '18:00',
              deliveryFee: 2000,
              minOrderValue: 10000,
              memberSince: '2026-10-01T00:00:00Z',
              isNew: true,
              trust: { averageRating: 4.5, reviewCount: 2, completedOrders: 1, isNew: true },
              distanceKm: 3,
              canDeliver: false,
              nextDeliveryDate: '2026-10-30',
              products: [item(1)],
            },
          },
        ],
      },
    });

    expect(await screen.findByRole('heading', { name: 'Tomato' })).toBeInTheDocument();
    expect(screen.getByAltText('Tomato 1/1')).toBeInTheDocument();
    expect(screen.getByText('20 kg available')).toBeInTheDocument();
    expect(screen.getByText('This farmer does not deliver to your location.')).toBeVisible();
    expect(screen.getByText('Monday, Friday')).toBeInTheDocument();
    expect(calls.find((c) => c.key.startsWith('GET /market/products/p1')).key).toContain(
      'lat=16.5&lng=80.6',
    );

    await user.click(screen.getByRole('link', { name: 'See farmer' }));
    expect(router.state.location.pathname).toBe('/buyer/farmers/f1');
    expect(await screen.findByRole('heading', { name: 'Ramu' })).toBeInTheDocument();
    // The seller label and the card badge both say New for a farmer with few orders.
    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
    expect(screen.getByText('★ 4.5 (2 reviews)')).toBeInTheDocument();
    expect(await screen.findByText('Very fresh')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tomato/ })).toBeInTheDocument();
  });
});
