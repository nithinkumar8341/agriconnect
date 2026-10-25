import { useTranslation } from 'react-i18next';

// Grey placeholder shapes while data loads. Shapes are hidden from screen readers;
// a single "Loading…" status is announced instead.
export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-xl bg-soil-200 motion-safe:animate-pulse ${className}`}
    />
  );
}

export function SkeletonList({ rows = 3 }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{t('status.loading')}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl bg-white p-3">
          <Skeleton className="size-16 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
