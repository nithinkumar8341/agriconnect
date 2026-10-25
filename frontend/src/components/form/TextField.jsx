import { useId } from 'react';

// Labelled input with an optional hint and error. The error is linked with aria-describedby so a
// screen reader reads it when the field is focused; aria-invalid marks the field itself.
export function TextField({ label, hint, error, prefix, className = '', ...inputProps }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-lg font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-base text-ink-muted">
          {hint}
        </p>
      )}
      <div
        className={`flex min-h-14 items-center overflow-hidden rounded-2xl border-2 bg-white focus-within:border-leaf-700 ${
          error ? 'border-danger-700' : 'border-soil-200'
        }`}
      >
        {prefix && (
          <span
            aria-hidden="true"
            className="border-r-2 border-soil-200 px-4 text-xl font-semibold text-ink-muted"
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-xl outline-none"
          {...inputProps}
        />
      </div>
      {error && (
        <p id={errorId} className="font-semibold text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
