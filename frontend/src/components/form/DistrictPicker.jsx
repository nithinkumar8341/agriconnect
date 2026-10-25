import { Check, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Searchable list of districts. Typing filters by the English, Telugu or Hindi name, so people can
// search in whichever script their keyboard has. Options are native radios (arrow keys work).
export function DistrictPicker({ label, districts, value, onChange, error }) {
  const { t, i18n } = useTranslation('onboarding');
  const [query, setQuery] = useState('');
  const name = useId();
  const searchId = useId();
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? districts.filter((d) => [d.en, d.te, d.hi].some((n) => n.toLowerCase().includes(needle)))
    : districts;
  const displayName = (district) => district[i18n.language] ?? district.en;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-lg font-semibold">{label}</legend>
      <label htmlFor={searchId} className="sr-only">
        {t('farmer.districtSearch')}
      </label>
      <div className="flex min-h-14 items-center gap-2 rounded-2xl border-2 border-soil-200 bg-white px-4 focus-within:border-leaf-700">
        <Search aria-hidden="true" className="size-6 text-ink-muted" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('farmer.districtSearch')}
          className="min-w-0 flex-1 bg-transparent py-3 text-xl outline-none"
        />
      </div>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-2xl border-2 border-soil-200 bg-white p-2">
        {visible.length === 0 && (
          <p className="p-3 text-lg text-ink-muted">{t('farmer.districtNone')}</p>
        )}
        {visible.map((district) => {
          const selected = district.en === value;
          return (
            <label
              key={district.en}
              className={`flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-lg has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-leaf-900 ${
                selected ? 'bg-leaf-700 font-semibold text-white' : 'hover:bg-leaf-50'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={district.en}
                checked={selected}
                onChange={() => onChange(district.en)}
                className="sr-only"
              />
              <span>{displayName(district)}</span>
              {selected && <Check aria-hidden="true" className="size-6" />}
            </label>
          );
        })}
      </div>
      {error && <p className="font-semibold text-danger-700">{error}</p>}
    </fieldset>
  );
}
