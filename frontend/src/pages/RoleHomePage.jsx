import { Construction, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/authContext.js';
import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/ui/BigButton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';

// Temporary home for each role until its real dashboard arrives (farmer: Prompt 6).
export function RoleHomePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout().catch(() => {});
  }

  return (
    <Screen title={t('home.title')} showBack={false}>
      <section className="rounded-2xl bg-white p-4">
        <h2 className="text-2xl font-bold">{t('home.welcome')}</h2>
        <p className="text-lg text-ink-muted">
          {t('home.signedInAs', { role: t(`roles.${user.role}`) })}
        </p>
      </section>
      <EmptyState
        icon={Construction}
        title={t('comingSoon.title')}
        message={t('comingSoon.message')}
      />
      <BigButton icon={LogOut} variant="secondary" loading={loggingOut} onClick={handleLogout}>
        {t('actions.logout')}
      </BigButton>
    </Screen>
  );
}
