import { IndianRupee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { Screen } from '../../components/Screen.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { formatDate, formatRupees } from '../../lib/format.js';
import { DetailRow } from '../buyer/ProductDetailPage.jsx';

// What the farmer earned from delivered orders, per order, with an estimate of the mandi
// commission they avoided (labelled as an estimate; the percentage is an app setting).
export function EarningsPage() {
  const { t, i18n } = useTranslation(['farmer', 'common']);
  const language = i18n.language;
  const { client } = useAuth();
  const request = useApiRequest(
    (signal) => client.get('/farmer/earnings?limit=50', { signal }),
    'earnings',
  );
  const money = (paise) => formatRupees(paise, language);

  if (!request.data) {
    return (
      <Screen title={t('earnings.title')}>
        {request.error ? (
          <ErrorState error={request.error} onRetry={request.reload} />
        ) : (
          <SkeletonList rows={3} />
        )}
      </Screen>
    );
  }
  const { totals, mandiEstimate, items } = request.data;
  if (totals.orders === 0) {
    return (
      <Screen title={t('earnings.title')}>
        <EmptyState icon={IndianRupee} title={t('earnings.empty')} />
      </Screen>
    );
  }

  return (
    <Screen title={t('earnings.title')}>
      <section className="flex flex-col gap-1 rounded-2xl bg-leaf-700 p-4 text-white">
        <p className="text-lg">{t('earnings.earned')}</p>
        <p className="text-4xl font-bold">{money(totals.earnings)}</p>
        <p className="text-lg">
          {t('earnings.delivered')}: {totals.orders}
        </p>
      </section>
      <dl className="rounded-2xl bg-white px-4 py-2 text-lg">
        <DetailRow label={t('earnings.produce')}>{money(totals.itemsTotal)}</DetailRow>
        <DetailRow label={t('earnings.delivery')}>{money(totals.deliveryFees)}</DetailRow>
        <DetailRow label={t('earnings.platformFee')}>{money(totals.platformFees)}</DetailRow>
      </dl>
      <p className="rounded-2xl bg-sun-100 px-4 py-3 text-lg">
        {t('earnings.mandi', {
          percent: mandiEstimate.percent,
          amount: money(mandiEstimate.commissionAvoided),
        })}
      </p>
      <p className="text-base text-ink-muted">{t('earnings.simulated')}</p>
      <ul className="flex flex-col gap-2">
        {items.map((order) => (
          <li key={order.id} className="rounded-2xl border-2 border-soil-200 bg-white p-4">
            <p className="text-lg font-semibold">
              {t('earnings.order', { date: formatDate(order.deliveredAt, language) })}
            </p>
            <p className="text-lg text-leaf-800">{money(order.priceBreakdown.farmerEarnings)}</p>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
