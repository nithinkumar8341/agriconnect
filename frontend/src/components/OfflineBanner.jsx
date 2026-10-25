import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();

  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="flex items-center justify-center gap-2 bg-sun-100 px-4 py-2 text-center font-semibold text-ink">
          <WifiOff aria-hidden="true" className="size-6 shrink-0" />
          {t('status.offline')}
        </p>
      )}
    </div>
  );
}
