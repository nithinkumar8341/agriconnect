import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { OfflineBanner } from '../components/OfflineBanner.jsx';

// Wraps every screen: a skip link for keyboard users and the offline banner.
export function RootLayout() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold"
      >
        {t('actions.skipToContent')}
      </a>
      <OfflineBanner />
      <Outlet />
    </div>
  );
}
