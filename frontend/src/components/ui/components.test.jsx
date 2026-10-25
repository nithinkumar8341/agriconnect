import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Save, Wheat } from 'lucide-react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import i18n from '../../i18n/index.js';
import { ApiError } from '../../lib/apiErrors.js';
import { LanguageSwitcher } from '../LanguageSwitcher.jsx';
import {
  BigButton,
  ConfirmSheet,
  ErrorState,
  IconTile,
  PresetChips,
  QuantityStepper,
  ToastProvider,
  useToast,
} from './index.js';

const inRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('BigButton', () => {
  it('shows icon and label, and is busy and disabled while loading', async () => {
    const onClick = vi.fn();
    render(
      <BigButton icon={Save} loading onClick={onClick}>
        Save
      </BigButton>,
    );
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders a link when given a destination', () => {
    inRouter(
      <BigButton icon={Save} to="/somewhere">
        Go
      </BigButton>,
    );

    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/somewhere');
  });
});

describe('IconTile', () => {
  it('announces a badge count with its meaning', () => {
    inRouter(<IconTile icon={Wheat} label="Orders" to="/orders" badge={3} badgeLabel="new" />);

    expect(screen.getByRole('link')).toHaveAccessibleName('Orders, 3 new');
  });

  it('explains a disabled tile instead of looking broken', () => {
    inRouter(<IconTile icon={Wheat} label="Assistant" disabled hint="Coming soon" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Assistant, Coming soon' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});

describe('QuantityStepper', () => {
  function Harness({ initial = 1, ...props }) {
    const [value, setValue] = useState(initial);
    return (
      <QuantityStepper
        label="Kilograms"
        value={value}
        onChange={setValue}
        unitLabel="kg"
        {...props}
      />
    );
  }

  it('steps by the given amount without floating-point noise', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0.1} step={0.1} />);

    await user.click(screen.getByRole('button', { name: 'Increase Kilograms' }));
    await user.click(screen.getByRole('button', { name: 'Increase Kilograms' }));

    expect(screen.getByRole('status')).toHaveTextContent('0.3');
    expect(screen.getByRole('status')).not.toHaveTextContent('0.30000000000000004');
  });

  it('stops at the minimum and maximum', async () => {
    const user = userEvent.setup();
    render(<Harness initial={1} step={1} min={1} max={2} />);

    expect(screen.getByRole('button', { name: 'Decrease Kilograms' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Increase Kilograms' }));
    expect(screen.getByRole('button', { name: 'Increase Kilograms' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('2');
  });

  it('is labelled as a group for screen readers', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Kilograms' })).toBeInTheDocument();
  });
});

describe('PresetChips', () => {
  it('works as a radio group, including arrow keys', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState(10);
      return (
        <PresetChips
          label="Amount"
          options={[10, 25, 50]}
          value={value}
          onChange={setValue}
          formatOption={(o) => `${o} kg`}
        />
      );
    }
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: '25 kg' }));
    expect(screen.getByRole('radio', { name: '25 kg' })).toBeChecked();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '50 kg' })).toBeChecked();
    expect(screen.getByRole('group', { name: 'Amount' })).toBeInTheDocument();
  });
});

describe('ConfirmSheet', () => {
  function Harness({ onConfirm }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <ConfirmSheet
          open={open}
          tone="danger"
          title="Remove listing?"
          message="Buyers will not see it."
          confirmLabel="Yes, remove"
          onConfirm={onConfirm}
          onCancel={() => setOpen(false)}
        />
      </>
    );
  }

  it('opens as a modal dialog with focus on the safe choice', async () => {
    const user = userEvent.setup();
    render(<Harness onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = screen.getByRole('dialog', { name: 'Remove listing?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('keeps Tab inside the sheet', async () => {
    const user = userEvent.setup();
    render(<Harness onConfirm={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.tab();
    expect(screen.getByRole('button', { name: 'Yes, remove' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness onConfirm={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('calls onConfirm when confirmed', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.click(screen.getByRole('button', { name: 'Yes, remove' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('Toast', () => {
  function Trigger() {
    const toast = useToast();
    return (
      <>
        <button type="button" onClick={() => toast.show('Listing saved')}>
          ok
        </button>
        <button type="button" onClick={() => toast.show('Could not save', { tone: 'error' })}>
          fail
        </button>
      </>
    );
  }

  it('announces successes politely and errors as alerts, then disappears', async () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Trigger />
        </ToastProvider>,
      );

      act(() => screen.getByRole('button', { name: 'ok' }).click());
      act(() => screen.getByRole('button', { name: 'fail' }).click());

      expect(screen.getByRole('status')).toHaveTextContent('Listing saved');
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save');

      act(() => vi.advanceTimersByTime(5000));
      expect(screen.queryByText('Listing saved')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('can be dismissed by hand', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'ok' }));

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Listing saved')).not.toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('explains an API error in the current language and offers a retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new ApiError({ code: 'NETWORK_ERROR' })} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('No internet connection');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('falls back to a generic message for unknown errors', () => {
    render(<ErrorState error={new ApiError({ code: 'WEIRD' })} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });
});

describe('LanguageSwitcher', () => {
  it('changes the language from any screen and remembers it', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Change language: English' }));
    await user.click(screen.getByRole('button', { name: 'తెలుగు' }));

    expect(i18n.language).toBe('te');
    expect(window.localStorage.getItem('agc.language')).toBe('te');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'భాష మార్చండి: తెలుగు' })).toBeInTheDocument();
  });
});
