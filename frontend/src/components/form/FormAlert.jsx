import { CircleAlert } from 'lucide-react';

// Error summary near the submit button. The live region stays mounted so screen readers
// announce a message the moment it appears.
export function FormAlert({ message }) {
  return (
    <div role="alert" aria-live="assertive">
      {message && (
        <p className="flex items-start gap-2 rounded-2xl bg-danger-50 px-4 py-3 text-lg font-semibold text-danger-800">
          <CircleAlert aria-hidden="true" className="mt-1 size-6 shrink-0" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
