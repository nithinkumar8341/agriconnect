import { RotateCw, TriangleAlert, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { BigButton } from './BigButton.jsx';

// Shown when loading fails. Pass the caught error and it is explained in the person's language;
// a retry button appears whenever onRetry is given.
export function ErrorState({ error, title, message, onRetry }) {
  const { t } = useTranslation();
  const isOffline = error?.code === 'NETWORK_ERROR';
  const Icon = isOffline ? WifiOff : TriangleAlert;

  return (
    <section
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border-2 border-danger-700/30 bg-danger-50 px-4 py-10 text-center"
    >
      <span className="grid size-20 place-items-center rounded-full bg-white text-danger-700">
        <Icon aria-hidden="true" className="size-10" />
      </span>
      <h2 className="text-xl font-bold">{title ?? t('errors.title')}</h2>
      <p className="max-w-prose text-lg text-ink">{message ?? t(errorMessageKey(error))}</p>
      {onRetry && (
        <div className="mt-2 w-full max-w-xs">
          <BigButton icon={RotateCw} onClick={onRetry}>
            {t('actions.retry')}
          </BigButton>
        </div>
      )}
    </section>
  );
}
