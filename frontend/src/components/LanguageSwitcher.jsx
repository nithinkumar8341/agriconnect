import { Languages } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/index.js';
import { BottomSheet } from './ui/BottomSheet.jsx';
import { LanguagePicker } from './LanguagePicker.jsx';

// Compact header button showing the current language in its own script; opens the big picker.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((language) => language.code === i18n.language) ?? LANGUAGES[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${t('language.change')}: ${current.nativeName}`}
        className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl border-2 border-soil-200 bg-white px-3 font-semibold hover:border-leaf-600"
      >
        <Languages aria-hidden="true" className="size-6 text-leaf-700" />
        <span lang={current.code}>{current.nativeName}</span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('language.choose')}>
        <LanguagePicker onChosen={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}
