import { KeyRound, Phone, Wallet, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { ReviewForm } from '../../components/buyer/Trust.jsx';
import { OrderTimeline } from '../../components/orders/OrderTimeline.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  ConfirmSheet,
  ErrorState,
  SkeletonList,
  useToast,
} from '../../components/ui/index.js';
import { useLiveOrder } from '../../hooks/useLiveOrder.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { formatDate, formatQuantity, formatRupees, localName } from '../../lib/format.js';
import { ORDER_STATUS_STYLES } from '../../lib/orderStatus.js';
import { DetailRow } from './ProductDetailPage.jsx';

// One order for the buyer: big status, the delivery code once accepted, the farmer's phone,
// what was ordered and the full price breakdown, and the timeline. Updates itself.
export function BuyerOrderDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const language = i18n.language;
  const { client } = useAuth();
  const toast = useToast();
  const live = useLiveOrder(id);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const money = (paise) => formatRupees(paise, language);

  if (!live.order) {
    return (
      <Screen title={t('orders.detailTitle')}>
        {live.error ? (
          <ErrorState error={live.error} onRetry={live.reload} />
        ) : (
          <SkeletonList rows={3} />
        )}
      </Screen>
    );
  }
  const { order } = live;

  async function pay() {
    setBusy(true);
    setError('');
    try {
      await client.post(`/payments/${order.checkoutGroupId}/pay`, {});
      toast.show(t('orders.paid'));
      live.reload();
    } catch (err) {
      setError(t(`common:${errorMessageKey(err)}`));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      live.replace((await client.post(`/orders/${order.id}/cancel`, {})).order);
      toast.show(t('orders.cancelled'));
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      live.reload();
      setError(
        t(`orders.errors.${err.code}`, { defaultValue: '' }) || t(`common:${errorMessageKey(err)}`),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={t('orders.detailTitle')}>
      <p
        role="status"
        className={`rounded-2xl px-4 py-4 text-center text-2xl font-bold ${ORDER_STATUS_STYLES[order.status]}`}
      >
        {t(`orders.status.${order.status}`)}
      </p>
      {order.isOpen && <p className="text-base text-ink-muted">{t('orders.autoRefresh')}</p>}

      {order.deliveryCode && (
        <section className="flex flex-col items-center gap-2 rounded-2xl border-2 border-leaf-700 bg-leaf-50 p-4 text-center">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound aria-hidden="true" className="size-5" />
            {t('orders.code')}
          </h2>
          <p className="font-mono text-5xl font-bold tracking-[0.3em]">{order.deliveryCode}</p>
          <p className="text-lg">{t('orders.codeHint')}</p>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-2xl border-2 border-soil-200 bg-white p-4">
        <h2 className="text-xl font-bold">
          {t('card.from', { name: order.farmer?.firstName, village: order.farmer?.village })}
        </h2>
        <p className="text-lg">
          {t('orders.delivery', { date: formatDate(order.delivery.date, language) })}
        </p>
        {order.farmer?.phone && (
          <BigButton icon={Phone} variant="secondary" href={`tel:${order.farmer.phone}`}>
            {t('orders.callFarmer', { name: order.farmer.firstName })}
          </BigButton>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4">
        <dl className="text-lg">
          {order.items.map((item) => (
            <DetailRow
              key={item.productId}
              label={`${localName(item.cropName, language)} · ${formatQuantity(item.quantity, language)} ${t(`common:units.${item.unit}`)}`}
            >
              {money(item.lineTotal)}
            </DetailRow>
          ))}
          <DetailRow label={t('cart.deliveryFee')}>
            {money(order.priceBreakdown.deliveryFee)}
          </DetailRow>
          <DetailRow label={t('cart.platformFee')}>
            {money(order.priceBreakdown.platformFee)}
          </DetailRow>
          <DetailRow label={t('cart.grandTotal')}>
            <span className="text-2xl">{money(order.priceBreakdown.buyerTotal)}</span>
          </DetailRow>
          <DetailRow label={t('orders.farmerReceives')}>
            {money(order.priceBreakdown.farmerEarnings)}
          </DetailRow>
          <DetailRow label={t('orders.paymentLabel')}>
            {t(order.paymentMethod === 'upi' ? 'orders.upi' : 'cart.cod')} ·{' '}
            {t(`orders.payment.${order.paymentStatus}`)}
          </DetailRow>
        </dl>
      </section>

      {order.paymentMethod === 'upi' && order.paymentStatus === 'pending' && order.isOpen && (
        <BigButton icon={Wallet} loading={busy} onClick={pay}>
          {t('orders.payNow', { amount: money(order.priceBreakdown.buyerTotal) })}
        </BigButton>
      )}

      {order.canReview && <ReviewForm orderId={order.id} onDone={live.reload} />}

      <OrderTimeline
        history={order.statusHistory}
        labelFor={(status) => t(`orders.status.${status}`)}
      />

      <FormAlert message={error} />
      {order.canCancel && (
        <BigButton icon={XCircle} variant="secondary" onClick={() => setConfirming(true)}>
          {t('orders.cancel')}
        </BigButton>
      )}
      {confirming && (
        <ConfirmSheet
          open
          tone="danger"
          confirmIcon={XCircle}
          title={t('orders.cancelTitle')}
          message={t('orders.cancelMessage')}
          confirmLabel={t('orders.cancelConfirm')}
          loading={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={cancel}
        />
      )}
    </Screen>
  );
}
