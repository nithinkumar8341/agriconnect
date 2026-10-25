import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ status: 'ok', db: 'up' }) })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the heading and the backend health status', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'AgriConnect' })).toBeInTheDocument();
    expect(await screen.findByText('Backend: ok, database: up')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/v1/health', expect.anything());
  });
});
