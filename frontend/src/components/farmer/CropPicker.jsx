import { Check, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localName } from '../../lib/format.js';
import { CropPhoto } from '../CropPhoto.jsx';
import { PresetChips } from '../ui/index.js';

const CATEGORIES = ['all', 'vegetable', 'leafy', 'fruit'];

// One photo tile. A button, so a single tap (or Enter) chooses the crop and moves on.
function CropTile({ crop, name, selected, onSelect }) {
  const { i18n } = useTranslation();
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(crop)}
      className={`relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-center ${
        selected ? 'border-leaf-700 ring-2 ring-leaf-700' : 'border-soil-200 hover:border-leaf-600'
      }`}
    >
      <CropPhoto crop={crop} className="aspect-square w-full" />
      <span className="flex min-h-12 flex-col justify-center px-1 py-1">
        <span className="text-base leading-tight font-semibold">{name}</span>
        {/* The English name too when reading in Telugu/Hindi: many farmers know both. */}
        {i18n.language !== 'en' && (
          <span className="text-xs leading-tight text-ink-muted">{crop.names.en}</span>
        )}
      </span>
      {selected && (
        <Check
          aria-hidden="true"
          className="absolute top-1 right-1 size-7 rounded-full bg-leaf-700 p-1 text-white"
        />
      )}
    </button>
  );
}

// Tap a crop photo instead of typing its name. Crops the farmer sold before come first; search
// works in Telugu, English or Hindi.
export function CropPicker({ crops, recentSlugs = [], value, onChange }) {
  const { t, i18n } = useTranslation('farmer');
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
          n?.toLowerCase().includes(needle),
        )),
  );
  const recent =
    !needle && category === 'all'
      ? recentSlugs.map((slug) => crops.find((c) => c.slug === slug)).filter(Boolean)
      : [];
  const rest = matches.filter((crop) => !recent.includes(crop));

  const grid = (list) => (
    <ul className="grid grid-cols-3 gap-2">
      {list.map((crop) => (
        <li key={crop.slug}>
          <CropTile
            crop={crop}
            name={name(crop)}
            selected={crop.slug === value}
            onSelect={onChange}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <section className="flex flex-col gap-3" aria-label={t('sell.cropHeading')}>
      <label htmlFor={searchId} className="sr-only">
        {t('sell.cropSearch')}
      </label>
      <div className="flex min-h-14 items-center gap-2 rounded-2xl border-2 border-soil-200 bg-white px-4 focus-within:border-leaf-700 focus-within:ring-4 focus-within:ring-leaf-700/20">
        <Search aria-hidden="true" className="size-6 text-ink-muted" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('sell.cropSearch')}
          className="min-w-0 flex-1 bg-transparent py-3 text-xl shadow-none outline-none focus-visible:shadow-none focus-visible:outline-none"
        />
      </div>
      <PresetChips
        label={t('products.filterLabel')}
        options={CATEGORIES}
        value={category}
        onChange={setCategory}
        formatOption={(c) => t(`sell.categories.${c}`)}
      />
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
    </section>
  );
}
