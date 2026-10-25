import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LanguageSwitcher } from '../LanguageSwitcher.jsx';

// Top bar of every screen: back (icon + word), the screen title, and the language switcher,
// so the language can be changed from anywhere without hunting through settings.
export function PageHeader({ title, showBack = true, onBack, actions }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b-2 border-soil-200 bg-soil-50">
      <div className="mx-auto flex min-h-16 max-w-screen-sm items-center gap-2 px-4 py-2">
        {showBack && (
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            className="flex min-h-12 shrink-0 items-center gap-1 rounded-xl px-2 font-semibold text-leaf-800 hover:bg-leaf-50"
          >
            <ArrowLeft aria-hidden="true" className="size-6" />
            <span>{t('actions.back')}</span>
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{title}</h1>
        {actions}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
