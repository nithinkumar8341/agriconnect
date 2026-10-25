import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LanguageSwitcher } from '../LanguageSwitcher.jsx';

const TITLE = 'line-clamp-2 text-xl leading-tight font-bold break-words';

// Top bar of every screen: back (icon + word), the screen title, and the language switcher,
// so the language can be changed from anywhere without hunting through settings.
// With a back button the title gets its own full-width line: in Telugu, "వెనుకకు" plus the
// language button left the title only a few letters wide on a 360px phone.
export function PageHeader({ title, showBack = true, onBack, actions }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b-2 border-soil-200 bg-soil-50">
      <div className="mx-auto flex max-w-screen-sm flex-col gap-1 px-4 py-2">
        <div className="flex min-h-12 items-center gap-2">
          {showBack ? (
            <button
              type="button"
              onClick={onBack ?? (() => navigate(-1))}
              className="flex min-h-12 shrink-0 items-center gap-1 rounded-xl px-2 font-semibold text-leaf-800 hover:bg-leaf-50"
            >
              <ArrowLeft aria-hidden="true" className="size-6" />
              <span>{t('actions.back')}</span>
            </button>
          ) : (
            <h1 className={`min-w-0 ${TITLE}`}>{title}</h1>
          )}
          <span className="flex-1" />
          {actions}
          <LanguageSwitcher />
        </div>
        {showBack && <h1 className={TITLE}>{title}</h1>}
      </div>
    </header>
  );
}
