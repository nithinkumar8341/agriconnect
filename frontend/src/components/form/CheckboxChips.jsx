import { Check } from 'lucide-react';

// Multi-select version of PresetChips (for example delivery days). Native checkboxes keep
// keyboard and screen-reader behaviour; the selected state is shown with a tick, not only colour.
export function CheckboxChips({ label, options, values, onChange, formatOption = String, error }) {
  function toggle(option) {
    onChange(values.includes(option) ? values.filter((v) => v !== option) : [...values, option]);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-lg font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <label
              key={option}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-lg font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf-900 ${
                selected
                  ? 'border-leaf-700 bg-leaf-700 text-white'
                  : 'border-soil-200 bg-white text-ink hover:border-leaf-600'
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(option)}
                className="sr-only"
              />
              {selected && <Check aria-hidden="true" className="size-5" />}
              {formatOption(option)}
            </label>
          );
        })}
      </div>
      {error && <p className="font-semibold text-danger-700">{error}</p>}
    </fieldset>
  );
}
