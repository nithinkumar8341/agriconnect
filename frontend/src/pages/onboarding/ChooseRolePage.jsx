import { LoaderCircle, ShoppingBasket, Tractor } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { Screen } from '../../components/Screen.jsx';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { LogoutLink } from './LogoutLink.jsx';

const CHOICES = [
  { role: 'farmer', icon: Tractor, labelKey: 'role.farmer', hintKey: 'role.farmerHint' },
  { role: 'buyer', icon: ShoppingBasket, labelKey: 'role.buyer', hintKey: 'role.buyerHint' },
];

// Two big cards. The role can be chosen only once (the server enforces it), so the choice is
// a single deliberate tap with no other options on the screen.
export function ChooseRolePage() {
  const { t } = useTranslation(['onboarding', 'common']);
  const { chooseRole } = useAuth();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  async function choose(role) {
    setPending(role);
    setError('');
    try {
      // On success the guard sends the person on to their profile form.
      await chooseRole(role);
    } catch (err) {
      setError(t(`common:${errorMessageKey(err)}`));
      setPending(null);
    }
  }

  return (
    <Screen title={t('role.title')} showBack={false}>
      <div className="flex flex-col gap-4">
        {CHOICES.map(({ role, icon: Icon, labelKey, hintKey }) => (
          <button
            key={role}
            type="button"
            disabled={pending !== null}
            onClick={() => choose(role)}
            className="flex min-h-36 items-center gap-4 rounded-2xl border-2 border-soil-200 bg-white p-4 text-left hover:border-leaf-600 disabled:opacity-70"
          >
            <span className="grid size-20 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700">
              {pending === role ? (
                <LoaderCircle aria-hidden="true" className="size-10 animate-spin" />
              ) : (
                <Icon aria-hidden="true" className="size-11" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-2xl font-bold">{t(labelKey)}</span>
              <span className="text-lg text-ink-muted">{t(hintKey)}</span>
            </span>
          </button>
        ))}
      </div>
      <FormAlert message={error} />
      <LogoutLink />
    </Screen>
  );
}
