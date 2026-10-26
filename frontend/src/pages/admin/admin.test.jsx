import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import { renderApp, signedInHandlers } from '../../test/helpers.jsx';

const admin = { id: 'u9', phone: '+919876543219', role: 'admin', language: 'en', status: 'active' };
const returnItem = {
  id: 'r1',
  orderId: 'o1',
  reason: 'rotten',
  note: 'Half the tomatoes were rotten',
  photos: [{ url: '/uploads/r.jpg', thumbnailUrl: '/uploads/r-thumb.webp' }],
  status: 'open',
  evidence: { listingPhotoUrls: [] },
  order: {
    buyerName: 'Padma',
    itemsTotal: 9000,
    items: [{ cropName: { en: 'Tomato' }, quantity: 3, unit: 'kg' }],
  },
};

function app(path, routes) {
  const handlers = new Proxy(signedInHandlers(admin, { profile: undefined }), {
    get(target, key) {
      if (typeof key !== 'string') return target[key];
      return routes[key.split('?')[0]] ?? target[key];
    },
  });
  return { user: userEvent.setup(), ...renderApp(path, handlers) };
}

beforeEach(() => changeLanguage('en'));

describe('Admin panel', () => {
  it('approves a return from the returns list', async () => {
    let items = [returnItem];
    const { user, calls } = app('/admin/returns', {
      'GET /admin/returns': () => [200, { items, total: items.length }],
      'POST /admin/returns/r1/resolve': () => {
        items = [];
        return [200, { id: 'r1', status: 'resolved' }];
      },
    });

    expect(await screen.findByText('Reason: Rotten')).toBeInTheDocument();
    expect(screen.getByText('“Half the tomatoes were rotten”')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve refund' }));

    expect(await screen.findByText('Nothing here.')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /admin/returns/r1/resolve').body).toEqual({
      decision: 'approve',
    });
  });

  it('shows an error when a fraud flag was already handled', async () => {
    const flag = {
      id: 'f1',
      ruleId: 'duplicate_address',
      severity: 'medium',
      evidence: { accounts: 4, limit: 3, pincode: '520010' },
      order: null,
    };
    const { user } = app('/admin/fraud-flags', {
      'GET /admin/fraud-flags': () => [200, { items: [flag], total: 1 }],
      'POST /admin/fraud-flags/f1/resolve': () => [
        409,
        { error: { code: 'ALREADY_RESOLVED', message: 'Already handled' } },
      ],
    });

    expect(
      await screen.findByText('4 accounts at one address (limit 3), pincode 520010'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
