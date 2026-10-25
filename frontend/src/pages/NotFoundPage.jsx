import { House, MapPinOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/authContext.js';
import { homePathFor } from '../auth/roles.js';
import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/ui/BigButton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';

export function NotFoundPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <Screen title={t('notFound.title')}>
      <EmptyState
        icon={MapPinOff}
        title={t('notFound.title')}
        message={t('notFound.message')}
        action={
          <BigButton icon={House} to={user ? homePathFor(user) : '/'}>
            {t('actions.goHome')}
          </BigButton>
        }
      />
    </Screen>
  );
}
