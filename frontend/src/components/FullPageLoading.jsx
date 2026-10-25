import { Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FullPageLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" className="grid min-h-dvh place-items-center bg-soil-50">
      <div className="flex flex-col items-center gap-3 text-leaf-700">
        <Sprout aria-hidden="true" className="size-14 motion-safe:animate-pulse" />
        <span className="text-lg font-semibold">{t('status.loading')}</span>
      </div>
    </div>
  );
}
