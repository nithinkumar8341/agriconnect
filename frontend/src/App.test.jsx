import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ json: () => Promise.resolve({ message: 'Hello from AgriConnect' }) }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the heading and the backend greeting', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'AgriConnect' })).toBeInTheDocument();
    expect(await screen.findByText('Backend says: Hello from AgriConnect')).toBeInTheDocument();
  });
});
