import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { anonymousHandlers, renderApp, signedInHandlers, testUsers } from '../test/helpers.jsx';

describe('routing and role guards', () => {
  it('shows the welcome screen with the language picker to visitors', async () => {
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'AgriConnect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'తెలుగు' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in with phone number' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('sends visitors who open a protected screen to the login screen', async () => {
    const { router } = renderApp('/farmer/orders', anonymousHandlers);

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.state).toEqual({ from: '/farmer/orders' });
  });

  it('lets a farmer into the farmer area with its bottom menu', async () => {
    renderApp('/farmer', signedInHandlers(testUsers.farmer));

    expect(await screen.findByText('Signed in as Farmer')).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Main menu' });
    expect(menu).toHaveTextContent('My products');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  it('redirects a buyer who opens a farmer screen to the buyer home', async () => {
    const { router } = renderApp('/farmer/products', signedInHandlers(testUsers.buyer));

    await waitFor(() => expect(router.state.location.pathname).toBe('/buyer'));
  });

  it('asks a signed-in user without a role to choose one', async () => {
    const { router } = renderApp('/buyer', signedInHandlers(testUsers.newcomer));

    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding/role'));
  });

  it('takes a signed-in user from the welcome screen straight to their home', async () => {
    const { router } = renderApp('/', signedInHandlers(testUsers.buyer));

    await waitFor(() => expect(router.state.location.pathname).toBe('/buyer'));
  });

  it('navigates between sections with the bottom menu', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/farmer', signedInHandlers(testUsers.farmer));

    await user.click(await screen.findByRole('link', { name: 'Orders' }));

    expect(router.state.location.pathname).toBe('/farmer/orders');
    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
  });

  it('logs out and returns to the login screen', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/farmer', signedInHandlers(testUsers.farmer));

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('shows a friendly page for unknown addresses', async () => {
    renderApp('/no-such-page');

    expect(await screen.findByText('We could not find this page.')).toBeInTheDocument();
  });
});
