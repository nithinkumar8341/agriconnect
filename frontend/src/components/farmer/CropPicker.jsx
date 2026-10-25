import { Check, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localName } from '../../lib/format.js';
import { PresetChips } from '../ui/index.js';

const CATEGORIES = ['all', 'vegetable', 'leafy', 'fruit'];

function CropTile({ crop, name, selected, group, onSelect }) {
  const { i18n } = useTranslation();
  return (
    <label
      className={`relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf-900 ${
        selected ? 'border-leaf-700 bg-leaf-50' : 'border-soil-200 bg-white hover:border-leaf-600'
      }`}
    >
      <input
        type="radio"
        name={group}
        value={crop.slug}
        checked={selected}
        onChange={() => onSelect(crop)}
        className="sr-only"
      />
      <span aria-hidden="true" className="text-4xl leading-none">
        {crop.icon}
      </span>
      <span className="text-base leading-tight font-semibold">{name}</span>
      {/* Show the English name too when reading in Telugu/Hindi: many farmers know both. */}
      {i18n.language !== 'en' && (
        <span className="text-xs leading-tight text-ink-muted">{crop.names.en}</span>
      )}
      {selected && (
        <Check aria-hidden="true" className="absolute top-1 right-1 size-6 text-leaf-700" />
      )}
    </label>
  );
}

// Tap a crop instead of typing its name. Crops the farmer sold before come first; search works
// in Telugu, English or Hindi; native radios give keyboard and screen-reader support.
export function CropPicker({ crops, recentSlugs = [], value, onChange, error }) {
  const { t, i18n } = useTranslation('farmer');
  const group = useId();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const name = (crop) => localName(crop.names, i18n.language);

  const needle = query.trim().toLowerCase();
  const matches = crops.filter(
    (crop) =>
      (category === 'all' || crop.category === category) &&
      (!needle ||
        [crop.names.en, crop.names.te, crop.names.hi].some((n) =>
          n.toLowerCase().includes(needle),
        )),
  );
  const recent =
    !needle && category === 'all'
      ? recentSlugs.map((slug) => crops.find((c) => c.slug === slug)).filter(Boolean)
      : [];
  const rest = matches.filter((crop) => !recent.includes(crop));

  const grid = (list) => (
    <div className="grid grid-cols-3 gap-2">
      {list.map((crop) => (
        <CropTile
          key={crop.slug}
          crop={crop}
          name={name(crop)}
          group={group}
          selected={crop.slug === value}
          onSelect={onChange}
        />
      ))}
    </div>
  );

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-2xl font-bold">{t('sell.cropHeading')}</legend>
      <label htmlFor={searchId} className="sr-only">
        {t('sell.cropSearch')}
      </label>
      <div className="flex min-h-14 items-center gap-2 rounded-2xl border-2 border-soil-200 bg-white px-4 focus-within:border-leaf-700">
        <Search aria-hidden="true" className="size-6 text-ink-muted" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('sell.cropSearch')}
          className="min-w-0 flex-1 bg-transparent py-3 text-xl outline-none"
        />
      </div>
      <PresetChips
        label={t('products.filterLabel')}
        options={CATEGORIES}
        value={category}
        onChange={setCategory}
        formatOption={(c) => t(`sell.categories.${c}`)}
      />
      {error && <p className="font-semibold text-danger-700">{error}</p>}
      {recent.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-ink-muted">{t('sell.soldBefore')}</h3>
          {grid(recent)}
          <hr className="border-soil-200" />
        </>
      )}
      {rest.length === 0 && recent.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-lg text-ink-muted">{t('sell.cropNone')}</p>
      ) : (
        grid(rest)
      )}
    </fieldset>
  );
}
