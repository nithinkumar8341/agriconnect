import { useId } from 'react';

// One-tap choices (for example 10 / 25 / 50 / 100 kg). Native radio inputs give keyboard arrows
// and screen-reader support for free; they are visually hidden and the label is the chip.
export function PresetChips({ label, options, value, onChange, formatOption = String }) {
  const name = useId();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-lg font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const selected = option === value;
          return (
            <label
              key={option}
              className={`flex min-h-12 min-w-16 cursor-pointer items-center justify-center rounded-full border-2 px-5 text-lg font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf-900 ${
                selected
                  ? 'border-leaf-700 bg-leaf-700 text-white'
                  : 'border-soil-200 bg-white text-ink hover:border-leaf-600'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {formatOption(option)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
