import 'fake-indexeddb/auto';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import { resetDraftsForTests, saveDraft } from '../../lib/photoDrafts.js';
import {
  renderApp,
  sellHandlers,
  signedInHandlers,
  testCrops,
  testUsers,
  withProducts,
} from '../../test/helpers.jsx';

const uploadedPhoto = {
  id: 'photo-1',
  status: 'uploaded',
  asset: {
    id: 'a'.repeat(24),
    url: '/uploads/photos/a.jpg',
    thumbnailUrl: '/uploads/photos/a-thumb.webp',
    status: 'pending',
  },
  createdAt: 1,
};

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

const farmer = () => signedInHandlers(testUsers.farmer);
const posts = (calls) => calls.filter((call) => call.key === 'POST /products');

// Photo already uploaded (as after an earlier visit), so the tests can focus on the three steps.
async function openSellWithPhoto(
  options,
  ready = () => screen.findByRole('radio', { name: /Tomato/ }),
) {
  await saveDraft(uploadedPhoto);
  const user = userEvent.setup();
  const app = renderApp('/farmer/sell', sellHandlers(farmer(), options));
  await ready();
  return { user, ...app };
}

async function fillAmount(user, { price = '30' } = {}) {
  await user.click(screen.getByRole('radio', { name: '10 kg' }));
  const typed = screen.getByLabelText('Or type the price (₹)');
  await user.clear(typed);
  await user.type(typed, price);
}

beforeEach(async () => {
  await changeLanguage('en');
  await resetDraftsForTests();
  localStorage.clear();
  setOnline(true);
});

describe('Sell flow', () => {
  it('publishes a listing in three steps and opens My Products', async () => {
    const { user, calls, router } = await openSellWithPhoto();

    await user.click(screen.getByRole('radio', { name: /Tomato/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      screen.getByRole('heading', { name: 'Quantity, price and harvest' }),
    ).toBeInTheDocument();

    await fillAmount(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    const review = screen.getByRole('region', { name: 'Check your listing' });
    expect(within(review).getByText('10 kg')).toBeInTheDocument();
    expect(within(review).getByText('₹300')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publish listing' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/farmer/products'));
    expect(posts(calls)).toHaveLength(1);
    expect(posts(calls)[0].body).toMatchObject({
      cropSlug: 'tomato',
      photoAssetIds: [uploadedPhoto.asset.id],
      quantity: 10,
      unit: 'kg',
      pricePerUnit: 3000,
    });
    expect(await screen.findByText(/Your listing is live/)).toBeInTheDocument();
    // The half-made listing is forgotten, so the next Sell starts fresh.
    expect(JSON.parse(localStorage.getItem('agc.sellDraft'))).toMatchObject({
      step: 1,
      cropSlug: null,
    });
  });

  it('asks for a photo and a crop before moving on', async () => {
    const user = userEvent.setup();
    renderApp('/farmer/sell', sellHandlers(farmer()));
    await screen.findByRole('radio', { name: /Tomato/ });

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Add at least one photo.')).toBeInTheDocument();
    expect(screen.getByText('Choose a crop.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Photos and crop' })).toBeInTheDocument();
  });

  it('warns when the price is very different from the last price for the crop', async () => {
    const { user } = await openSellWithPhoto({
      lastPrice: { pricePerUnit: 2500, unit: 'kg', listedAt: '2026-10-20T00:00:00Z' },
    });
    await user.click(screen.getByRole('radio', { name: /Tomato/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // The last price is filled in for them.
    await waitFor(() => expect(screen.getByLabelText('Or type the price (₹)')).toHaveValue('25'));
    expect(screen.queryByText(/very different/)).not.toBeInTheDocument();

    await fillAmount(user, { price: '250' });
    expect(screen.getByText(/very different from your last price \(₹25 per kg\)/)).toBeVisible();
  });

  it('keeps a listing made offline and publishes it once the internet is back', async () => {
    const { user, calls } = await openSellWithPhoto();
    await user.click(screen.getByRole('radio', { name: /Tomato/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await fillAmount(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    act(() => setOnline(false));
    await user.click(screen.getByRole('button', { name: 'Publish listing' }));

    expect(screen.getByText(/You are offline. Your listing is saved/)).toBeInTheDocument();
    expect(posts(calls)).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('agc.sellDraft'))).toMatchObject({
      publishWhenOnline: true,
    });

    act(() => setOnline(true));
    await screen.findByText(/Your listing is live/);
    expect(posts(calls)).toHaveLength(1);
  });

  it('reopens a half-made listing where the farmer left it', async () => {
    localStorage.setItem(
      'agc.sellDraft',
      JSON.stringify({ step: 2, cropSlug: 'spinach', unit: 'bunch', quantity: 20 }),
    );
    await openSellWithPhoto({}, () =>
      screen.findByRole('heading', { name: 'Quantity, price and harvest' }),
    );
    expect(await screen.findByRole('radio', { name: '20 bunch' })).toBeChecked();
    // Spinach can be sold by the bunch or by the kilo.
    expect(screen.getByRole('radio', { name: 'kg' })).toBeInTheDocument();
  });

  it('finds a crop by its Telugu name', async () => {
    await changeLanguage('te');
    const user = userEvent.setup();
    renderApp('/farmer/sell', sellHandlers(farmer()));
    await screen.findByRole('radio', { name: /టమాటా/ });

    await user.type(screen.getByRole('searchbox'), 'పాల');

    expect(screen.getByRole('radio', { name: /పాలకూర/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /టమాటా/ })).not.toBeInTheDocument();
  });
});

describe('Managing a listing', () => {
  const listing = (overrides = {}) => ({
    id: 'p1',
    crop: { ...testCrops[0] },
    quantity: 50,
    availableQuantity: 30,
    unit: 'kg',
    pricePerUnit: 3000,
    status: 'available',
    pausedReason: null,
    harvestDate: new Date().toISOString(),
    photos: [],
    photoUrl: null,
    isLowStock: false,
    isPastShelfLife: false,
    ...overrides,
  });

  function openMyProducts(product, extra = {}) {
    const handlers = withProducts({ ...farmer(), ...extra }, () => [
      200,
      { items: [product], page: 1, limit: 20, total: 1 },
    ]);
    return { user: userEvent.setup(), ...renderApp('/farmer/products', handlers) };
  }

  it('pauses a listing and reloads the list', async () => {
    const { user, calls } = openMyProducts(listing(), {
      'POST /products/p1/status': () => [200, { product: listing({ status: 'paused' }) }],
    });

    await user.click(await screen.findByRole('button', { name: 'Manage: Tomato' }));
    const sheet = screen.getByRole('dialog', { name: /Tomato: what do you want to do/ });
    expect(within(sheet).queryByRole('button', { name: 'Start selling again' })).toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Pause selling' }));

    expect(await screen.findByText('Listing paused.')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /products/p1/status').body).toEqual({
      action: 'pause',
    });
    await waitFor(() =>
      expect(calls.filter((c) => c.key.startsWith('GET /products/mine'))).toHaveLength(2),
    );
  });

  it('explains when a new quantity is below what buyers already ordered', async () => {
    const { user } = openMyProducts(listing(), {
      'PATCH /products/p1': () => [
        409,
        { error: { code: 'QUANTITY_BELOW_SOLD', message: 'Too low.' } },
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Manage: Tomato' }));
    await user.click(screen.getByRole('button', { name: 'Edit price or quantity' }));
    await user.click(screen.getByRole('button', { name: /Decrease How much do you have/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/Buyers already ordered more than this/)).toBeInTheDocument();
  });

  it('cannot resume a listing paused for being too old, but can sell it again', async () => {
    const { user, calls } = openMyProducts(
      listing({ status: 'paused', pausedReason: 'expired', isPastShelfLife: true }),
      { 'POST /products/p1/duplicate': () => [201, { product: listing({ id: 'p2' }) }] },
    );

    expect(await screen.findByText(/Paused automatically/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Manage: Tomato' }));
    expect(screen.getByRole('button', { name: 'Start selling again' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Sell again' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Sell Tomato again' })).getByRole('button', {
        name: 'Sell again',
      }),
    );

    expect(await screen.findByText('New listing published.')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /products/p1/duplicate').body).toEqual({
      quantity: 50,
    });
  });

  it('deletes a listing only after confirming', async () => {
    const { user, calls } = openMyProducts(listing(), {
      'DELETE /products/p1': () => [204, null],
    });

    await user.click(await screen.findByRole('button', { name: 'Manage: Tomato' }));
    await user.click(screen.getByRole('button', { name: 'Delete listing' }));
    expect(calls.some((c) => c.key === 'DELETE /products/p1')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(await screen.findByText('Listing deleted.')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'DELETE /products/p1')).toBe(true);
  });
});
