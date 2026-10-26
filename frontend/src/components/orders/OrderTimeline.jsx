import { CircleCheck, CircleX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BAD = ['cancelled', 'rejected', 'failed'];

// What happened to an order, oldest first, with the time and any reason given.
export function OrderTimeline({ history, labelFor }) {
  const { t, i18n } = useTranslation('common');
  const time = (at) =>
    new Intl.DateTimeFormat(`${i18n.language}-IN`, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(at));

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
      <h2 className="text-xl font-bold">{t('timeline')}</h2>
      <ol className="flex flex-col gap-3">
        {history.map((entry) => {
          const Icon = BAD.includes(entry.status) ? CircleX : CircleCheck;
          return (
            <li key={`${entry.status}:${entry.at}`} className="flex gap-3">
              <Icon
                aria-hidden="true"
                className={`mt-1 size-6 shrink-0 ${BAD.includes(entry.status) ? 'text-danger-700' : 'text-leaf-700'}`}
              />
              <div className="flex flex-col">
                <span className="text-lg font-semibold">{labelFor(entry.status)}</span>
                <span className="text-base text-ink-muted">{time(entry.at)}</span>
                {entry.reason && <span className="text-base">“{entry.reason}”</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
