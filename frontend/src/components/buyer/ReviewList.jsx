import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { formatDate } from '../../lib/format.js';

// A farmer's latest reviews (verified purchases), shown on the farmer and product pages.
export function ReviewList({ farmerId }) {
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
