import { LogIn, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import { homePathFor, LOGIN_PATH } from '../auth/roles.js';
import { FullPageLoading } from '../components/FullPageLoading.jsx';
import { LanguagePicker } from '../components/LanguagePicker.jsx';
import { BigButton } from '../components/ui/BigButton.jsx';

// First screen: language first (before anything has to be read), then one primary action.
export function WelcomePage() {
  const { t } = useTranslation();
  const { status, user, profile } = useAuth();

  if (status === 'loading') return <FullPageLoading />;
  if (status === 'authenticated') return <Navigate to={homePathFor(user, profile)} replace />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-screen-sm flex-col gap-8 px-4 py-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-24 place-items-center rounded-full bg-leaf-700 text-white">
          <Sprout aria-hidden="true" className="size-14" />
        </span>
        <h1 className="text-3xl font-bold text-leaf-900">{t('app.name')}</h1>
        <p className="text-xl text-ink-muted">{t('app.tagline')}</p>
      </header>

      <section aria-labelledby="choose-language" className="flex flex-col gap-3">
        <h2 id="choose-language" className="text-xl font-bold">
          {t('language.choose')}
        </h2>
        <LanguagePicker />
      </section>

      <BigButton icon={LogIn} to={LOGIN_PATH} className="mt-auto">
        {t('actions.login')}
      </BigButton>
    </div>
  );
}
