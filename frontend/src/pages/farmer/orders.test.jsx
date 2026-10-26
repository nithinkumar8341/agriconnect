import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import { renderApp, sampleProfiles, signedInHandlers, testUsers } from '../../test/helpers.jsx';

const tomato = { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' };
const base = {
  id: 'o1',
  checkoutGroupId: 'g1',
  items: [
    {
      productId: 'p1',
      cropName: tomato,
      unit: 'kg',
      quantity: 3,
      pricePerUnit: 3000,
      lineTotal: 9000,
    },
  ],
  priceBreakdown: {
    itemsTotal: 9000,
    deliveryFee: 2000,
    platformFee: 0,
    buyerTotal: 11000,
    farmerEarnings: 11000,
  },
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  statusHistory: [{ status: 'placed', at: '2026-10-26T04:00:00Z' }],
  createdAt: '2026-10-26T04:00:00Z',
};
const farmerOrder = (status, extra = {}) => ({
  ...base,
  status,
  isOpen: !['delivered', 'cancelled', 'rejected', 'failed'].includes(status),
  buyer: { firstName: 'Padma' },
  delivery: { date: '2026-10-28', fee: 2000, address: { area: 'Benz Circle', pincode: '520010' } },
  deliveryOtpLocked: false,
  actions:
    {
      placed: ['accept', 'reject'],
      accepted: ['dispatch', 'fail'],
      out_for_delivery: ['deliver', 'fail'],
    }[status] ?? [],
  ...extra,
});

function app(path, user, routes) {
  const handlers = new Proxy(signedInHandlers(user, { profile: sampleProfiles[user.role] }), {
    get(target, key) {
      if (typeof key !== 'string') return target[key];
      return routes[key.split('?')[0]] ?? target[key];
    },
  });
  return { user: userEvent.setup(), ...renderApp(path, handlers) };
}

beforeEach(() => changeLanguage('en'));

describe('Farmer order screens', () => {
  it('accepts, sets out and delivers with the buyer code; rejects ask for a reason', async () => {
    let current = farmerOrder('placed');
    const { user, calls } = app('/farmer/orders/o1', testUsers.farmer, {
      'GET /orders/o1': () => [200, { order: current }],
      'POST /orders/o1/accept': () => {
        current = farmerOrder('accepted', {
          buyer: { firstName: 'Padma', name: 'Padma Rani', phone: '+919000000101' },
        });
        return [200, { order: current }];
      },
      'POST /orders/o1/dispatch': () => {
        current = farmerOrder('out_for_delivery');
        return [200, { order: current }];
      },
      'POST /orders/o1/deliver': (request) =>
        request.body.code === '4321'
          ? [200, { order: farmerOrder('delivered') }]
          : [
              400,
              {
                error: { code: 'DELIVERY_OTP_WRONG', message: 'no', details: { attemptsLeft: 4 } },
              },
            ],
    });

    expect(
      await screen.findByText('Full address and phone number appear after you accept.'),
    ).toBeInTheDocument();
    expect(screen.getByText('You get ₹110')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    const sheet = screen.getByRole('dialog', { name: 'Why are you rejecting?' });
    expect(within(sheet).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Accept order' }));
    expect(await screen.findByRole('link', { name: 'Call Padma' })).toHaveAttribute(
      'href',
      'tel:+919000000101',
    );

    await user.click(screen.getByRole('button', { name: 'Out for delivery' }));
    const codeField = await screen.findByLabelText('Code from the buyer (4 digits)');
    await user.type(codeField, '1111');
    await user.click(screen.getByRole('button', { name: 'Delivered' }));
    expect(await screen.findByText('That code is not right. 4 tries left.')).toBeInTheDocument();

    await user.clear(codeField);
    await user.type(codeField, '4321');
    await user.click(screen.getByRole('button', { name: 'Delivered' }));
    expect(await screen.findByText('Delivered. Well done!')).toBeInTheDocument();
    expect(
      calls.filter((c) => c.key === 'POST /orders/o1/deliver').map((c) => c.body.code),
    ).toEqual(['1111', '4321']);
  });

  it('shows the buyer their delivery code once accepted', async () => {
    const order = {
      ...base,
      status: 'accepted',
      isOpen: true,
      farmer: { id: 'f1', firstName: 'Ramu', village: 'Kankipadu', phone: '+919000000102' },
      delivery: {
        date: '2026-10-28',
        fee: 2000,
        address: { landmark: 'Temple', pincode: '520010' },
      },
      deliveryCode: '4321',
      canCancel: false,
      actions: [],
    };
    app('/buyer/orders/o1', testUsers.buyer, { 'GET /orders/o1': () => [200, { order }] });

    expect(await screen.findByText('4321')).toBeInTheDocument();
    expect(screen.getByText('Your delivery code')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call Ramu' })).toHaveAttribute(
      'href',
      'tel:+919000000102',
    );
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  });
});
