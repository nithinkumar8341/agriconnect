import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { changeLanguage } from '../../i18n/index.js';
import {
  renderApp,
  sampleDashboard,
  sampleProfiles,
  signedInHandlers,
  testUsers,
  withProducts,
} from '../../test/helpers.jsx';

const tomato = { slug: 'tomato', names: { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' }, icon: '🍅' };

function listing(overrides = {}) {
  return {
    id: 'p1',
    crop: tomato,
    quantity: 100,
    availableQuantity: 60,
    unit: 'kg',
    pricePerUnit: 2500,
    status: 'available',
    harvestDate: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z',
    photoUrl: null,
    isLowStock: false,
    isPastShelfLife: false,
    ...overrides,
  };
}

const page = (items, { total = items.length, pageNumber = 1 } = {}) => ({
  items,
  page: pageNumber,
  limit: 20,
  total,
});

describe('farmer home', () => {
  beforeEach(() => changeLanguage('en'));

  it('greets the farmer and shows today’s numbers', async () => {
    renderApp(
      '/farmer',
      signedInHandlers(testUsers.farmer, {
        dashboard: sampleDashboard({ orders: { today: 3, new: 2, pendingDelivery: 1 } }),
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Namaste, Ramu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Orders today: 3' })).toHaveAttribute(
      'href',
      '/farmer/orders',
    );
    expect(screen.getByRole('link', { name: 'Waiting to deliver: 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My orders, 2 new' })).toBeInTheDocument();
  });

  it('reaches every farmer task in one tap (two-tap rule)', async () => {
    renderApp('/farmer', signedInHandlers(testUsers.farmer));
    await screen.findByRole('heading', { name: 'Namaste, Ramu' });

    const tasks = screen.getByRole('heading', { name: 'What do you want to do?' }).parentElement;
    const hrefs = within(tasks)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '/farmer/sell',
      '/farmer/products',
      '/farmer/orders',
      '/farmer/earnings',
      '/farmer/prices',
    ]);
    // The assistant is a placeholder until Prompt 20, and says so rather than looking broken.
    expect(
      within(tasks).getByRole('group', { name: 'Ask assistant, Coming soon' }),
    ).toBeInTheDocument();
    // Profile and settings are in the bottom menu, one tap away on every screen.
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/farmer/profile',
    );
  });

  it('calls the farmer’s own agent with one tap', async () => {
    renderApp(
      '/farmer',
      signedInHandlers(testUsers.farmer, {
        dashboard: sampleDashboard({ agent: { phone: '+919999900001' } }),
      }),
    );

    expect(await screen.findByRole('link', { name: 'Call my agent' })).toHaveAttribute(
      'href',
      'tel:+919999900001',
    );
  });

  it('explains when there is no agent instead of showing a dead button', async () => {
    renderApp('/farmer', signedInHandlers(testUsers.farmer));

    expect(
      await screen.findByRole('group', { name: 'Call my agent, No agent yet' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('lists what is running low, in the farmer’s language, and links to that filter', async () => {
    await changeLanguage('te');
    renderApp(
      '/farmer',
      signedInHandlers(testUsers.farmer, {
        dashboard: sampleDashboard({
          lowStock: [listing({ availableQuantity: 10, isLowStock: true })],
        }),
      }),
    );

    expect(await screen.findByText('టమాటా: ఇంకా 10 కిలో మిగిలింది')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'తక్కువగా ఉన్నవి: 1' })).toHaveAttribute(
      'href',
      '/farmer/products?status=low',
    );
  });

  it('offers a retry when the dashboard cannot load', async () => {
    const user = userEvent.setup();
    const handlers = signedInHandlers(testUsers.farmer);
    let attempts = 0;
    handlers['GET /farmer/dashboard'] = () => {
      attempts += 1;
      return attempts === 1
        ? [500, { error: { code: 'INTERNAL_ERROR' } }]
        : [200, sampleDashboard()];
    };
    renderApp('/farmer', handlers);

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Orders today: 0' })).toBeInTheDocument();
  });

  it.each(['en', 'te', 'hi'])('has no accessibility violations in %s', async (language) => {
    await changeLanguage(language);
    const { container } = renderApp(
      '/farmer',
      signedInHandlers(testUsers.farmer, {
        dashboard: sampleDashboard({ lowStock: [listing({ isLowStock: true })] }),
      }),
    );
    await screen.findAllByRole('link', { name: /: 0$/ });

    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('my products', () => {
  beforeEach(() => changeLanguage('en'));

  it('shows stock, price, status and warnings for each listing', async () => {
    renderApp(
      '/farmer/products',
      withProducts(signedInHandlers(testUsers.farmer), () => [
        200,
        page([
          listing({ availableQuantity: 10, isLowStock: true, isPastShelfLife: true }),
          listing({ id: 'p2', status: 'paused', availableQuantity: 40, quantity: 40 }),
        ]),
      ]),
    );

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Tomato');
    expect(cards[0]).toHaveTextContent('₹25 per kg');
    expect(cards[0]).toHaveTextContent('10 of 100 kg left');
    expect(cards[0]).toHaveTextContent('Selling');
    expect(cards[0]).toHaveTextContent('Running low');
    expect(cards[0]).toHaveTextContent('Harvested long ago');
    expect(cards[1]).toHaveTextContent('Paused');
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument();
  });

  it('filters by status and keeps the filter in the address', async () => {
    const user = userEvent.setup();
    const requested = [];
    const { router } = renderApp(
      '/farmer/products',
      withProducts(signedInHandlers(testUsers.farmer), (request, calls) => {
        requested.push(calls.at(-1).key);
        return [200, page([listing()])];
      }),
    );
    await screen.findAllByRole('article');

    await user.click(screen.getByRole('radio', { name: 'Out of stock' }));

    await waitFor(() => expect(router.state.location.search).toBe('?status=out_of_stock'));
    expect(requested.at(-1)).toBe('GET /products/mine?page=1&limit=20&status=out_of_stock');
  });

  it('opens directly on "Running low" from the home card', async () => {
    const requested = [];
    renderApp(
      '/farmer/products?status=low',
      withProducts(signedInHandlers(testUsers.farmer), (request, calls) => {
        requested.push(calls.at(-1).key);
        return [200, page([])];
      }),
    );

    expect(await screen.findByRole('radio', { name: 'Running low' })).toBeChecked();

    expect(await screen.findByText('None of your products match this filter.')).toBeInTheDocument();
    expect(requested[0]).toContain('status=low');
  });

  it('invites a new farmer to sell when there are no listings at all', async () => {
    renderApp('/farmer/products', withProducts(signedInHandlers(testUsers.farmer)));

    expect(await screen.findByRole('heading', { name: 'No products yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sell produce' })).toHaveAttribute(
      'href',
      '/farmer/sell',
    );
  });

  it('loads more listings page by page', async () => {
    const user = userEvent.setup();
    const firstPage = Array.from({ length: 20 }, (_, i) => listing({ id: `a${i}` }));
    renderApp(
      '/farmer/products',
      withProducts(signedInHandlers(testUsers.farmer), (request, calls) =>
        calls.at(-1).key.includes('page=2')
          ? [200, page([listing({ id: 'b1' })], { total: 21, pageNumber: 2 })]
          : [200, page(firstPage, { total: 21 })],
      ),
    );
    expect(await screen.findByText('Showing 20 of 21')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByText('Showing 21 of 21')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });
});

describe('farmer profile', () => {
  beforeEach(() => changeLanguage('en'));

  it('shows the saved details and delivery settings', async () => {
    await changeLanguage('te');
    renderApp('/farmer/profile', signedInHandlers(testUsers.farmer));

    expect(await screen.findByText('కృష్ణా, ఆంధ్రప్రదేశ్')).toBeInTheDocument();
    expect(screen.getByText('సోమవారం, బుధవారం, శుక్రవారం')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
  });

  it('edits the profile and sends rupees as paise', async () => {
    const user = userEvent.setup();
    const handlers = signedInHandlers(testUsers.farmer);
    let saved;
    handlers['PUT /profile/farmer'] = (request) => {
      saved = request.body;
      return [200, { profile: { ...sampleProfiles.farmer, ...request.body } }];
    };
    renderApp('/farmer/profile', handlers);

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Your name');
    await user.clear(name);
    await user.type(name, 'Ramu Naidu');
    await user.click(screen.getByRole('button', { name: 'Increase Smallest order you accept' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Your details are saved.')).toBeInTheDocument();
    expect(saved).toMatchObject({
      name: 'Ramu Naidu',
      district: 'Krishna',
      minOrderValue: 15000,
      deliveryFee: 2000,
      servicePincodes: ['521151'],
      location: null,
    });
    expect(screen.getByText('Ramu Naidu')).toBeInTheDocument();
  });

  it('does not save a profile with problems and says where they are', async () => {
    const user = userEvent.setup();
    const handlers = signedInHandlers(testUsers.farmer);
    handlers['PUT /profile/farmer'] = vi.fn();
    renderApp('/farmer/profile', handlers);

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Your name'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByText('Please fill this in.')).toBeInTheDocument();
    expect(handlers['PUT /profile/farmer']).not.toHaveBeenCalled();
  });

  it('logs out on all phones only after confirming', async () => {
    const user = userEvent.setup();
    const { router, calls } = renderApp('/farmer/profile', signedInHandlers(testUsers.farmer));

    await user.click(await screen.findByRole('button', { name: 'Log out on all phones' }));
    expect(calls.some((c) => c.key === 'POST /auth/logout-all')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Yes, log out everywhere' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(calls.some((c) => c.key === 'POST /auth/logout-all')).toBe(true);
  });
});
