import { useTranslation } from 'react-i18next';

// "Step 2 of 3" plus a bar, so people know how much is left (CLAUDE.md: max 3 steps per task).
export function StepProgress({ current, total }) {
  const { t } = useTranslation('auth');
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-ink-muted">{t('stepOf', { current, total })}</p>
      <div aria-hidden="true" className="flex gap-2">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 rounded-full ${index < current ? 'bg-leaf-700' : 'bg-soil-200'}`}
          />
        ))}
      </div>
    </div>
  );
}
