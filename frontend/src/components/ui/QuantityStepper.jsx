import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

function decimalsOf(step) {
  return (String(step).split('.')[1] ?? '').length;
}

// Big minus/plus buttons so amounts can be set without the keyboard. Values are rounded to the
// step's precision because 0.1 + 0.2 in floating point is 0.30000000000000004.
export function QuantityStepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  unitLabel,
}) {
  const { t, i18n } = useTranslation();
  const labelId = useId();
  const decimals = decimalsOf(step);
  const clamp = (next) => Math.min(max, Math.max(min, Number(next.toFixed(decimals))));
  const formatted = new Intl.NumberFormat(`${i18n.language}-IN`, {
    maximumFractionDigits: decimals,
  }).format(value);

  const buttonClass =
    'grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-leaf-700 bg-white text-leaf-800 hover:bg-leaf-50 disabled:border-soil-200 disabled:text-ink-muted disabled:opacity-60';

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className="text-lg font-semibold">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          aria-label={t('stepper.decrease', { label })}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          <Minus aria-hidden="true" className="size-8" />
        </button>
        <output
          aria-live="polite"
          className="flex min-h-16 flex-1 items-baseline justify-center gap-2 rounded-2xl bg-white px-2 py-2"
        >
          <span className="text-3xl font-bold">{formatted}</span>
          {unitLabel && <span className="text-lg text-ink-muted">{unitLabel}</span>}
        </output>
        <button
          type="button"
          className={buttonClass}
          aria-label={t('stepper.increase', { label })}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
        >
          <Plus aria-hidden="true" className="size-8" />
        </button>
      </div>
    </div>
  );
}
