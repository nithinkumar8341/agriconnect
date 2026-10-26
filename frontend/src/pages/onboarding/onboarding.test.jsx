import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import {
  createFakeBackend,
  mockGeolocation,
  renderApp,
  signedInHandlers,
  testUsers,
} from '../../test/helpers.jsx';

async function loginNewUser(user, handlers) {
  const app = renderApp('/login', handlers);
  await user.type(await screen.findByLabelText('Mobile number'), '9876543210');
  await user.click(screen.getByRole('button', { name: 'Get OTP' }));
  await user.type(await screen.findByLabelText('6-digit code'), '123456');
  await waitFor(() => expect(app.router.state.location.pathname).toBe('/onboarding/role'));
  return app;
}

async function fillFarmerDetails(user, { pincode = '521151' } = {}) {
  await user.type(await screen.findByLabelText('Your name'), 'Ramu');
  await user.type(screen.getByRole('combobox', { name: 'District' }), 'kris');
  await user.click(screen.getByRole('option', { name: 'Krishna' }));
  await user.type(screen.getByLabelText('Mandal'), 'Kankipadu');
  await user.type(screen.getByLabelText('Village'), 'Kankipadu');
  await user.type(screen.getByLabelText('Pincode'), pincode);
  await user.click(screen.getByRole('button', { name: 'Next' }));
}

describe('complete sign-up flows', () => {
  beforeEach(() => changeLanguage('en'));

  it('new farmer: phone, code, role, three short steps, then the farmer home', async () => {
    const user = userEvent.setup();
    mockGeolocation('allow');
    const { db, handlers } = createFakeBackend();
    const { router } = await loginNewUser(user, handlers);

    await user.click(await screen.findByRole('button', { name: /I am a farmer/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding/farmer'));
    expect(await screen.findByText('Step 1 of 3')).toBeInTheDocument();

    await fillFarmerDetails(user);
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(
      await screen.findByText(/Location saved \(accurate to about 18 metres\)/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Step 3 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Saturday' }));
    await user.click(screen.getByRole('button', { name: 'Increase Delivery charge per order' }));
    await user.click(screen.getByRole('button', { name: 'Save and start selling' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/farmer'));
    expect(db.savedProfiles[0]).toEqual({
      name: 'Ramu',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      mandal: 'Kankipadu',
      village: 'Kankipadu',
      pincode: '521151',
      location: { latitude: 16.438412, longitude: 80.782634 },
      deliveryRadiusKm: 10,
      servicePincodes: [],
      deliveryDays: ['mon', 'wed', 'fri', 'sat'],
      cutoffTime: '18:00',
      minOrderValue: 10000,
      deliveryFee: 2500,
    });
    expect(await screen.findByRole('heading', { name: 'Namaste, Ramu' })).toBeInTheDocument();
  });

  it('new buyer: role, one address screen, then the buyer home', async () => {
    const user = userEvent.setup();
    const { db, handlers } = createFakeBackend();
    const { router } = await loginNewUser(user, handlers);

    await user.click(await screen.findByRole('button', { name: /I want to buy/ }));
    await user.type(await screen.findByLabelText('Your name'), 'Padma');
    await user.type(screen.getByLabelText('Pincode'), '520010');
    await user.type(screen.getByLabelText('Landmark'), 'Near Benz Circle');
    await user.click(screen.getByRole('button', { name: 'Save and start shopping' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/buyer'));
    expect(db.savedProfiles[0]).toEqual({
      name: 'Padma',
      address: {
        label: 'Home',
        houseAndStreet: '',
        landmark: 'Near Benz Circle',
        area: '',
        pincode: '520010',
        location: null,
      },
    });
  });
});

describe('farmer onboarding details', () => {
  beforeEach(() => changeLanguage('en'));

  function renderFarmerOnboarding() {
    const { db, handlers } = createFakeBackend({ existingUser: testUsers.farmer });
    handlers['POST /auth/token/refresh'] = () => [
      200,
      { accessToken: 'access-1', user: testUsers.farmer },
    ];
    return { db, handlers, ...renderApp('/onboarding/farmer', handlers) };
  }

  it('shows what is missing on step 1 instead of moving on', async () => {
    const user = userEvent.setup();
    renderFarmerOnboarding();

    await user.click(await screen.findByRole('button', { name: 'Next' }));

    expect(screen.getByText('Please choose your district.')).toBeInTheDocument();
    expect(screen.getAllByText('Please fill this in.')).toHaveLength(3);
    expect(screen.getByText('Enter a 6-digit pincode.')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('catches a pincode from the other state', async () => {
    const user = userEvent.setup();
    renderFarmerOnboarding();

    await fillFarmerDetails(user, { pincode: '500032' });

    expect(screen.getByText('This pincode is not in Andhra Pradesh.')).toBeInTheDocument();
  });

  it('lists only the chosen state’s districts, searchable in Telugu too', async () => {
    const user = userEvent.setup();
    renderFarmerOnboarding();

    await user.click(await screen.findByRole('radio', { name: 'Telangana' }));
    const field = screen.getByRole('combobox', { name: 'District' });
    await user.click(field);
    const list = screen.getByRole('listbox', { name: 'District' });
    expect(within(list).queryByRole('option', { name: 'Krishna' })).not.toBeInTheDocument();

    await user.type(field, 'హైద');
    expect(
      within(list)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Hyderabad']);
  });

  it('picks with the keyboard, clears on state change, and can be changed with X', async () => {
    const user = userEvent.setup();
    renderFarmerOnboarding();
    const field = await screen.findByRole('combobox', { name: 'District' });

    await user.type(field, 'KRISH');
    await user.keyboard('{Enter}');
    expect(field).toHaveValue('Krishna');
    expect(field).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('radio', { name: 'Telangana' }));
    expect(field).toHaveValue('');

    await user.click(field);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(field).toHaveValue('Hyderabad');

    await user.click(screen.getByRole('button', { name: 'Clear district' }));
    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('treats refusing location as normal: explains, then delivers by the farm pincode', async () => {
    const user = userEvent.setup();
    mockGeolocation('deny');
    const { db, router } = renderFarmerOnboarding();
    await fillFarmerDetails(user);

    await user.click(await screen.findByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/Location permission is turned off/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue without location' }));

    expect(
      screen.queryByRole('group', { name: 'How far will you deliver?' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove 521151' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save and start selling' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/farmer'));
    expect(db.savedProfiles[0]).toMatchObject({ location: null, servicePincodes: ['521151'] });
  });

  it('needs at least one delivery pincode when no location is shared', async () => {
    const user = userEvent.setup();
    mockGeolocation('deny');
    const { db } = renderFarmerOnboarding();
    await fillFarmerDetails(user);
    await user.click(await screen.findByRole('button', { name: 'Continue without location' }));

    await user.click(screen.getByRole('button', { name: 'Remove 521151' }));
    await user.click(screen.getByRole('button', { name: 'Save and start selling' }));

    expect(
      screen.getByText('Without your location, add at least one pincode you deliver to.'),
    ).toBeInTheDocument();
    expect(db.savedProfiles).toHaveLength(0);
  });

  it('keeps every answer when saving fails offline, and saves on the next try', async () => {
    const user = userEvent.setup();
    mockGeolocation('deny');
    const { db, handlers, router } = renderFarmerOnboarding();
    await fillFarmerDetails(user);
    await user.click(await screen.findByRole('button', { name: 'Continue without location' }));
    await user.click(screen.getByRole('checkbox', { name: 'Sunday' }));

    const savingHandler = handlers['PUT /profile/farmer'];
    handlers['PUT /profile/farmer'] = () => {
      throw new TypeError('Failed to fetch');
    };
    await user.click(screen.getByRole('button', { name: 'Save and start selling' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /No internet connection.*answers are kept/,
    );
    expect(screen.getByRole('checkbox', { name: 'Sunday' })).toBeChecked();
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();

    handlers['PUT /profile/farmer'] = savingHandler;
    await user.click(screen.getByRole('button', { name: 'Save and start selling' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/farmer'));
    expect(db.savedProfiles[0].deliveryDays).toContain('sun');
  });

  it('shows a retry when the district list cannot load', async () => {
    const user = userEvent.setup();
    const { handlers } = createFakeBackend({ existingUser: testUsers.farmer });
    handlers['POST /auth/token/refresh'] = () => [
      200,
      { accessToken: 'a', user: testUsers.farmer },
    ];
    let attempts = 0;
    handlers['GET /locations/districts'] = () => {
      attempts += 1;
      return attempts === 1
        ? [500, { error: { code: 'INTERNAL_ERROR' } }]
        : [
            200,
            {
              states: [
                {
                  state: 'Andhra Pradesh',
                  districts: [{ en: 'Krishna', te: 'కృష్ణా', hi: 'कृष्णा' }],
                },
              ],
            },
          ];
    };
    renderApp('/onboarding/farmer', handlers);

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    await user.click(await screen.findByRole('combobox', { name: 'District' }));
    expect(screen.getByRole('option', { name: 'Krishna' })).toBeInTheDocument();
  });
});

describe('onboarding guards and logout', () => {
  beforeEach(() => changeLanguage('en'));

  it('sends a farmer without a profile from their home to onboarding', async () => {
    const { router } = renderApp('/farmer', signedInHandlers(testUsers.farmer, { profile: null }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding/farmer'));
  });

  it('sends an onboarded farmer away from the onboarding screens', async () => {
    const { router } = renderApp('/onboarding/farmer', signedInHandlers(testUsers.farmer));

    await waitFor(() => expect(router.state.location.pathname).toBe('/farmer'));
  });

  it('does not let a buyer open the farmer onboarding', async () => {
    const { router } = renderApp(
      '/onboarding/farmer',
      signedInHandlers(testUsers.buyer, { profile: null }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding/buyer'));
  });

  it('lets someone on the role screen log out ("Not you?")', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/onboarding/role', signedInHandlers(testUsers.newcomer));

    await user.click(await screen.findByRole('button', { name: 'Not you? Log out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('saves a language change to the account while logged in', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/buyer/orders', signedInHandlers(testUsers.buyer));

    await user.click(await screen.findByRole('button', { name: /Change language/ }));
    await user.click(screen.getByRole('button', { name: 'हिंदी' }));

    await waitFor(() =>
      expect(calls.filter((c) => c.key === 'PATCH /users/me').map((c) => c.body)).toContainEqual({
        language: 'hi',
      }),
    );
  });
});
