import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// One searchable dropdown (combobox) of the chosen state's districts. Tap to open, type to filter
// by the English, Telugu or Hindi name, tap or Enter to choose; X clears it to pick again.
// Closed, the field shows the chosen district in the app's language.
export function DistrictPicker({ label, districts, value, onChange, error }) {
  const { t, i18n } = useTranslation('onboarding');
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const displayName = (district) => district[i18n.language] ?? district.en;
  const selected = districts.find((d) => d.en === value) ?? null;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? districts.filter((d) => [d.en, d.te, d.hi].some((n) => n?.toLowerCase().includes(needle)))
    : districts;
  const optionId = (index) => `${id}-option-${index}`;

  function openList() {
    setQuery('');
    setActive(Math.max(0, districts.indexOf(selected)));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function choose(district) {
    onChange(district.en);
    close();
  }

  function clear() {
    onChange('');
    openList();
    inputRef.current?.focus();
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return openList();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => Math.min(Math.max(current + step, 0), visible.length - 1));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (visible[active]) choose(visible[active]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-lg font-semibold">
        {label}
      </label>
      <div className="relative">
        {/* The wrapper draws the only border and focus ring; the input inside draws none. */}
        <div
          className={`flex min-h-14 items-center gap-2 rounded-2xl border-2 bg-white pl-4 focus-within:border-leaf-700 focus-within:ring-4 focus-within:ring-leaf-700/20 ${
            error ? 'border-danger-700' : 'border-soil-200'
          }`}
        >
          <Search aria-hidden="true" className="size-6 shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && visible[active] ? optionId(active) : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            autoComplete="off"
            placeholder={t('farmer.districtSearch')}
            value={open ? query : selected ? displayName(selected) : ''}
            onClick={() => !open && openList()}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            onBlur={close}
            className="min-w-0 flex-1 bg-transparent py-3 text-xl shadow-none outline-none focus-visible:shadow-none focus-visible:outline-none"
          />
          {selected && !open ? (
            <button
              type="button"
              aria-label={t('farmer.districtClear')}
              onClick={clear}
              className="flex size-12 shrink-0 items-center justify-center rounded-xl text-ink-muted"
            >
              <X aria-hidden="true" className="size-6" />
            </button>
          ) : (
            <ChevronDown aria-hidden="true" className="mr-3 size-6 shrink-0 text-ink-muted" />
          )}
        </div>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border-2 border-soil-200 bg-white p-2 shadow-lg"
          >
            {visible.length === 0 && (
              <li role="presentation" className="p-3 text-lg text-ink-muted">
                {t('farmer.districtNone')}
              </li>
            )}
            {visible.map((district, index) => {
              const isSelected = district.en === value;
              return (
                <li
                  key={district.en}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  // Keep focus in the input so its blur does not close the list before the tap.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(district)}
                  className={`flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-lg ${
                    index === active ? 'bg-leaf-50' : ''
                  } ${isSelected ? 'font-semibold text-leaf-800' : ''}`}
                >
                  <span>{displayName(district)}</span>
                  {isSelected && <Check aria-hidden="true" className="size-6 shrink-0" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error && (
        <p id={errorId} className="font-semibold text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
