import { useState } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { FormAlert } from '../form/FormAlert.jsx';
import { TextField } from '../form/TextField.jsx';
import { BigButton, PresetChips, useToast } from '../ui/index.js';

// "New" for sellers with few deliveries; otherwise average stars and delivered orders.
export function TrustLine({ trust }) {
  const { t } = useTranslation('buyer');
  if (!trust) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-lg">
      {trust.isNew && (
        <span className="rounded-full bg-sun-100 px-3 py-1 font-semibold">{t('farmer.new')}</span>
      )}
      {trust.averageRating !== null && (
        <span className="font-semibold">
          {t('trust.rating', { rating: trust.averageRating, count: trust.reviewCount })}
        </span>
      )}
      <span className="text-ink-muted">{t('trust.orders', { count: trust.completedOrders })}</span>
    </p>
  );
}

// One-tap 1-5 stars plus an optional comment, shown on a delivered order not yet reviewed.
export function ReviewForm({ orderId, onDone }) {
  const { t } = useTranslation(['buyer', 'common']);
  const { client } = useAuth();
  const toast = useToast();
  const [stars, setStars] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await client.post(`/orders/${orderId}/review`, {
        stars,
        comment: comment.trim() || undefined,
      });
      toast.show(t('review.thanks'));
      onDone();
    } catch (err) {
      setError(t(`common:${errorMessageKey(err)}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-sun-400 bg-white p-4">
      <h2 className="text-xl font-bold">{t('review.title')}</h2>
      <PresetChips
        label={t('review.stars')}
        options={[1, 2, 3, 4, 5]}
        value={stars}
        onChange={setStars}
        formatOption={(count) => t('review.starLabel', { count })}
      />
      <TextField
        label={t('review.comment')}
        value={comment}
        maxLength={500}
        onChange={(event) => setComment(event.target.value)}
      />
      <FormAlert message={error} />
      <BigButton icon={Send} loading={busy} disabled={!stars} onClick={submit}>
        {t('review.submit')}
      </BigButton>
    </section>
  );
}
