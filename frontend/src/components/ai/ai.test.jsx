import 'fake-indexeddb/auto';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { changeLanguage } from '../../i18n/index.js';
import { resetDraftsForTests, saveDraft } from '../../lib/photoDrafts.js';
import { renderApp, sellHandlers, signedInHandlers, testUsers } from '../../test/helpers.jsx';

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

// The Sell screen's handlers plus the AI routes given in `routes` (matched without the query).
async function openSell(routes) {
  await saveDraft(uploadedPhoto);
  const base = sellHandlers(signedInHandlers(testUsers.farmer));
  const handlers = new Proxy(base, {
    get(target, key) {
      if (typeof key !== 'string') return target[key];
      return routes[key.split('?')[0]] ?? target[key];
    },
  });
  const user = userEvent.setup();
  const app = renderApp('/farmer/sell', handlers);
  await screen.findByRole('radio', { name: /Tomato/ });
  return { user, ...app };
}

beforeEach(async () => {
  await changeLanguage('en');
  await resetDraftsForTests();
  localStorage.clear();
});

describe('AI helpers', () => {
  it('shows a price suggestion with its source and fills the price on tap', async () => {
    const { user } = await openSell({
      'GET /ai/price-hint': () => [
        200,
        {
          status: 'market_sales',
          suggested: 2800,
          low: 2500,
          high: 3200,
          sampleSize: 6,
          confidence: 'medium',
          district: 'Krishna',
          windowDays: 30,
        },
      ],
    });
    await user.click(screen.getByRole('radio', { name: /Tomato/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    const hint = await screen.findByRole('region', { name: 'Price suggestion' });
    expect(within(hint).getByText('From 6 recent sales in Krishna (last 30 days).')).toBeVisible();
    await user.click(within(hint).getByRole('button', { name: 'Use ₹28' }));
    expect(screen.getByLabelText('Or type the price (₹)')).toHaveValue('28');
  });

  it('answers in the chat and explains when the helper is down', async () => {
    let up = true;
    const { user, calls } = await openSell({
      'POST /ai/chat': () =>
        up
          ? [200, { reply: 'Pay by cash or UPI.', sources: ['payment'], usedLlm: true }]
          : [503, { error: { code: 'AI_UNAVAILABLE', message: 'down' } }],
    });

    await user.click(screen.getByRole('button', { name: 'Help' }));
    await user.click(screen.getByRole('button', { name: 'How do I pay?' }));
    expect(await screen.findByText('Pay by cash or UPI.')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /ai/chat').body).toEqual({
      message: 'How do I pay?',
      language: 'en',
    });

    up = false;
    await user.type(screen.getByLabelText('Type or speak your question'), 'Is tomato available?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/The helper is not available right now/)).toBeInTheDocument();
  });
});

describe('voice input in the chat', () => {
  // Stands in for the browser's SpeechRecognition: `outcome` decides what "the user said".
  function installSpeech(outcome) {
    const instances = [];
    class FakeRecognition {
      constructor() {
        instances.push(this);
      }
      start() {
        setTimeout(() => {
          if (outcome.text) this.onresult({ results: [[{ transcript: outcome.text }]] });
          if (outcome.error) this.onerror({ error: outcome.error });
          this.onend();
        }, 10);
      }
      stop() {}
      abort() {}
    }
    window.SpeechRecognition = FakeRecognition;
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    return instances;
  }

  afterEach(() => {
    delete window.SpeechRecognition;
  });

  it('greys out the mic and explains when the browser has no speech recognition', async () => {
    const { user } = await openSell({});
    await user.click(screen.getByRole('button', { name: 'Help' }));
    const mic = screen.getByRole('button', { name: /Voice input does not work in this browser/ });
    expect(mic).toHaveAttribute('aria-disabled', 'true');
    await user.click(mic);
    expect(await screen.findByText(/Please use Chrome or Edge, or type/)).toBeInTheDocument();
  });

  it('sends a spoken question in the app language', async () => {
    const instances = installSpeech({ text: 'How do I pay?' });
    const { user, calls } = await openSell({
      'POST /ai/chat': () => [200, { reply: 'Pay by cash or UPI.', sources: [], usedLlm: false }],
    });
    await changeLanguage('hi');
    await user.click(screen.getByRole('button', { name: 'मदद' }));
    await user.click(screen.getByRole('button', { name: 'अपना सवाल बोलें' }));

    expect(await screen.findByText('Pay by cash or UPI.')).toBeInTheDocument();
    expect(instances[0].lang).toBe('hi-IN');
    expect(calls.find((c) => c.key === 'POST /ai/chat').body).toEqual({
      message: 'How do I pay?',
      language: 'hi',
    });
  });

  it('tells the user how to fix a blocked microphone', async () => {
    installSpeech({ error: 'not-allowed' });
    const { user } = await openSell({});
    await user.click(screen.getByRole('button', { name: 'Help' }));
    await user.click(screen.getByRole('button', { name: 'Speak your question' }));
    expect(await screen.findByText(/Microphone is blocked/)).toBeInTheDocument();
  });
});
