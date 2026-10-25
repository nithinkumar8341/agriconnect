import { Plus, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidPincode } from '../../lib/locationRules.js';
import { BigButton } from '../ui/BigButton.jsx';
import { TextField } from './TextField.jsx';

// List of 6-digit pincodes with add and remove; duplicates are ignored. Laid out in one column
// (heading, hint, current pincodes, input, add button) so nothing is wider than a small phone.
export function PincodeListEditor({ label, hint, values, onChange, error, max = 30 }) {
  const { t } = useTranslation('onboarding');
  const headingId = useId();
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');

  function add() {
    if (!isValidPincode(draft)) {
      setDraftError(t('errors.pincode'));
      return;
    }
    if (!values.includes(draft) && values.length < max) onChange([...values, draft]);
    setDraft('');
    setDraftError('');
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-lg font-semibold">
        {label}
      </h3>
      {hint && <p className="text-base text-ink-muted">{hint}</p>}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {values.map((pincode) => (
            <li key={pincode}>
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== pincode))}
                aria-label={t('farmer.removePincode', { pincode })}
                className="flex min-h-12 items-center gap-2 rounded-full border-2 border-leaf-700 bg-leaf-50 px-4 text-lg font-semibold text-leaf-800"
              >
                {pincode}
                <X aria-hidden="true" className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="font-semibold text-danger-700">{error}</p>}
      <TextField
        label={t('farmer.pincode')}
        error={draftError}
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        }}
      />
      <BigButton icon={Plus} variant="secondary" onClick={add}>
        {t('farmer.addPincode')}
      </BigButton>
    </section>
  );
}
