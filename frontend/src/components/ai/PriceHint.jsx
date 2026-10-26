import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { formatDate, formatRupees } from '../../lib/format.js';
import { BigButton } from '../ui/index.js';

// Suggested price on the sell screen. Always says where the number comes from (recent sales in
// the district, or wholesale mandi prices) so it is never mistaken for a live market rate.
// Optional: if the AI service is down the sell flow carries on without it.
export function PriceHint({ crop, unit, onUse }) {
  const { t, i18n } = useTranslation('common');
  const { client } = useAuth();
  const language = i18n.language;
  const hint = useApiRequest(
    (signal) => client.get(`/ai/price-hint?crop=${crop}&unit=${unit}`, { signal }),
    `price-hint:${crop}:${unit}`,
  );
  if (!hint.data) return null;
  const h = hint.data;
  if (h.status === 'no_data') {
    return (
      <p className="rounded-2xl bg-white p-4 text-lg text-ink-muted">{t('ai.price.noData')}</p>
    );
  }

  const source =
    h.status === 'mandi_reference'
      ? t('ai.price.mandi', { market: h.market, date: formatDate(h.date, language) })
      : t('ai.price.sales', { n: h.sampleSize, district: h.district, days: h.windowDays });
  return (
    <section
      aria-label={t('ai.price.title')}
      className="flex flex-col gap-2 rounded-2xl border-2 border-leaf-700 bg-white p-4"
    >
      <p className="flex items-center gap-2 text-lg font-semibold text-leaf-800">
        <Sparkles aria-hidden="true" className="size-5" />
        {t('ai.price.title')}
      </p>
      <p className="text-2xl font-bold">
        {formatRupees(h.suggested, language)} / {t(`units.${unit}`)}
      </p>
      <p className="text-lg">
        {t('ai.price.range', {
          low: formatRupees(h.low, language),
          high: formatRupees(h.high, language),
        })}
      </p>
      <p className="text-base text-ink-muted">{source}</p>
      {h.confidence === 'low' && (
        <p className="text-base text-ink-muted">{t('ai.price.lowConfidence')}</p>
      )}
      <BigButton variant="secondary" icon={Check} onClick={() => onUse(h.suggested / 100)}>
        {t('ai.price.use', { price: formatRupees(h.suggested, language) })}
      </BigButton>
    </section>
  );
}
