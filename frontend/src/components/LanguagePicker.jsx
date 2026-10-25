import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, LANGUAGES } from '../i18n/index.js';

// Big buttons labelled in each language's own script, so a Telugu reader finds "తెలుగు"
// even while the app is showing English.
export function LanguagePicker({ onChosen }) {
  const { i18n } = useTranslation();

  async function choose(code) {
    await changeLanguage(code);
    onChosen?.(code);
  }

  return (
    <div className="flex flex-col gap-3">
      {LANGUAGES.map(({ code, nativeName }) => {
        const selected = i18n.language === code;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={selected}
            onClick={() => choose(code)}
            className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border-2 px-6 text-2xl font-bold ${
              selected
                ? 'border-leaf-700 bg-leaf-700 text-white'
                : 'border-soil-200 bg-white text-ink hover:border-leaf-600'
            }`}
          >
            <span>{nativeName}</span>
            {selected && <Check aria-hidden="true" className="size-7" />}
          </button>
        );
      })}
    </div>
  );
}
