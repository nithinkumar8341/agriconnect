import { BadgeCheck, CircleAlert, MapPin, MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { DistanceText, MarketProductCard } from '../../components/buyer/MarketProductCard.jsx';
import { TrustLine } from '../../components/buyer/Trust.jsx';
import { Screen } from '../../components/Screen.jsx';
import { ErrorState, SkeletonList } from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { useBuyerLocationParams } from '../../hooks/useBuyerLocationParams.js';
import { formatDate, formatRupees, formatTime } from '../../lib/format.js';
import { DetailRow } from './ProductDetailPage.jsx';

function ReviewList({ farmerId }) {
  const { t, i18n } = useTranslation('buyer');
  const { client } = useAuth();
  const reviews = useApiRequest(
    (signal) => client.get(`/market/farmers/${farmerId}/reviews?limit=20`, { signal }),
    `reviews:${farmerId}`,
  );
  if (!reviews.data) return null;
  if (reviews.data.total === 0) {
    return (
      <p className="flex items-start gap-2 text-lg text-ink-muted">
        <MessageSquareText aria-hidden="true" className="mt-1 size-5 shrink-0" />
        {t('trust.noReviews')}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {reviews.data.items.map((review) => (
        <li key={review.id} className="rounded-2xl bg-white p-4">
          <p className="text-lg font-semibold">
            {'★'.repeat(review.stars)}
            <span className="text-soil-200">{'★'.repeat(5 - review.stars)}</span>{' '}
            <span className="text-base font-normal text-ink-muted">
              {review.buyerFirstName} · {formatDate(review.createdAt, i18n.language)}
            </span>
          </p>
          {review.comment && <p className="text-lg">{review.comment}</p>}
        </li>
      ))}
    </ul>
  );
}

// A farmer's public page: first name and village only (no phone or exact location), delivery
// terms, what they sell now, and a place for reviews (verified purchases, Prompt 14).
export function FarmerPublicPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const language = i18n.language;
  const { client } = useAuth();
  const query = useBuyerLocationParams();
  const request = useApiRequest(
    (signal) => client.get(`/market/farmers/${id}?${query}`, { signal }),
    `${id}?${query}`,
  );

  if (request.loading || request.error) {
    return (
      <Screen title={t('farmer.title')}>
        {request.loading ? (
          <SkeletonList rows={3} />
        ) : (
          <ErrorState error={request.error} onRetry={request.reload} />
        )}
      </Screen>
    );
  }

  const { farmer } = request.data;
  return (
    <Screen title={farmer.firstName}>
      <section className="flex flex-col gap-2 rounded-2xl border-2 border-soil-200 bg-white p-4">
        <p className="text-xl font-bold">
          {farmer.village}, {farmer.mandal}
        </p>
        <p className="text-lg text-ink-muted">{farmer.district}</p>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 rounded-full bg-leaf-100 px-3 py-1 font-semibold text-leaf-900">
            <BadgeCheck aria-hidden="true" className="size-5" />
            {t(`farmer.levels.${farmer.verificationLevel}`)}
          </span>
        </div>
        <TrustLine trust={farmer.trust} />
        {farmer.distanceKm !== null && (
          <p className="flex items-center gap-2 text-lg">
            <MapPin aria-hidden="true" className="size-5 shrink-0" />
            <DistanceText km={farmer.distanceKm} />
          </p>
        )}
        <p className="text-base text-ink-muted">
          {t('farmer.since', { date: formatDate(farmer.memberSince, language) })}
        </p>
      </section>

      {!farmer.canDeliver && (
        <p className="flex items-start gap-2 rounded-2xl bg-sun-100 px-4 py-3 text-lg font-semibold">
          <CircleAlert aria-hidden="true" className="mt-1 size-5 shrink-0" />
          {t('product.cannotDeliver')}
        </p>
      )}

      <dl className="rounded-2xl bg-white px-4 py-2 text-lg">
        <DetailRow label={t('product.deliveryDays')}>
          {farmer.deliveryDays.map((day) => t(`common:weekdays.${day}`)).join(', ')}
        </DetailRow>
        {farmer.nextDeliveryDate && (
          <DetailRow label={t('product.nextDelivery')}>
            {formatDate(farmer.nextDeliveryDate, language)}
          </DetailRow>
        )}
        <DetailRow label={t('product.deliveryFee')}>
          {formatRupees(farmer.deliveryFee, language)}
        </DetailRow>
        <DetailRow label={t('product.minOrder')}>
          {formatRupees(farmer.minOrderValue, language)}
        </DetailRow>
      </dl>
      <p className="text-base text-ink-muted">
        {t('farmer.cutoff', { time: formatTime(farmer.cutoffTime, language) })}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">{t('farmer.selling')}</h2>
        {farmer.products.length === 0 ? (
          <p className="text-lg text-ink-muted">{t('farmer.nothing')}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {farmer.products.map((product) => (
              <li key={product.id}>
                <MarketProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">{t('farmer.reviews')}</h2>
        <ReviewList farmerId={farmer.id} />
      </section>
    </Screen>
  );
}
