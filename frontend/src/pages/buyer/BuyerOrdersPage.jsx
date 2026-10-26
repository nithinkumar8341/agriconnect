import { ChevronDown, ClipboardList, Eye, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  SkeletonList,
  useToast,
} from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { ORDER_STATUS_STYLES } from '../../lib/orderStatus.js';
import { formatDate, formatQuantity, formatRupees, localName } from '../../lib/format.js';

const PAGE_SIZE = 20;

function OrderCard({ order, onCancel }) {
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const language = i18n.language;
  return (
    <article className="flex flex-col gap-2 rounded-2xl border-2 border-soil-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold">
          {t('card.from', { name: order.farmer?.firstName, village: order.farmer?.village })}
        </h3>
        <span
          className={`self-start rounded-full px-3 py-1 text-base font-semibold ${ORDER_STATUS_STYLES[order.status]}`}
        >
          {t(`orders.status.${order.status}`)}
        </span>
      </div>
      <ul className="text-lg">
        {order.items.map((item) => (
          <li key={item.productId}>
            {localName(item.cropName, language)} · {formatQuantity(item.quantity, language)}{' '}
            {t(`common:units.${item.unit}`)}
          </li>
        ))}
      </ul>
      <p className="text-lg">
        {t('orders.delivery', { date: formatDate(order.delivery.date, language) })}
      </p>
      <p className="text-lg font-semibold">
        {t('orders.total', {
          amount: formatRupees(order.priceBreakdown.buyerTotal, language),
          method: t('cart.cod'),
        })}
      </p>
      <BigButton icon={Eye} to={`/buyer/orders/${order.id}`}>
        {t('orders.open')}
      </BigButton>
      {order.canCancel && (
        <BigButton icon={XCircle} variant="secondary" onClick={() => onCancel(order)}>
          {t('orders.cancel')}
        </BigButton>
      )}
    </article>
  );
}

function OrderList({ onCancel }) {
  const { t } = useTranslation(['buyer', 'common']);
  const { client } = useAuth();
  const first = useApiRequest(
    (signal) => client.get(`/orders/mine?page=1&limit=${PAGE_SIZE}`, { signal }),
    'orders',
  );
  const [more, setMore] = useState({ items: [], page: 1, loading: false, error: '' });

  async function loadMore() {
    setMore((current) => ({ ...current, loading: true, error: '' }));
    try {
      const next = await client.get(`/orders/mine?page=${more.page + 1}&limit=${PAGE_SIZE}`);
      setMore((c) => ({
        items: [...c.items, ...next.items],
        page: c.page + 1,
        loading: false,
        error: '',
      }));
    } catch (err) {
      setMore((c) => ({ ...c, loading: false, error: t(`common:${errorMessageKey(err)}`) }));
    }
  }

  if (first.loading) return <SkeletonList rows={3} />;
  if (first.error) return <ErrorState error={first.error} onRetry={first.reload} />;
  if (first.data.total === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t('orders.emptyTitle')}
        message={t('orders.emptyMessage')}
      />
    );
  }
  const all = [...first.data.items, ...more.items];
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {all.map((order) => (
          <li key={order.id}>
            <OrderCard order={order} onCancel={onCancel} />
          </li>
        ))}
      </ul>
      <FormAlert message={more.error} />
      {all.length < first.data.total && (
        <BigButton icon={ChevronDown} variant="secondary" loading={more.loading} onClick={loadMore}>
          {t('home.loadMore')}
        </BigButton>
      )}
    </div>
  );
}

// The buyer's orders, newest first. An order can be cancelled until the farmer accepts it.
export function BuyerOrdersPage() {
  const { t } = useTranslation(['buyer', 'common']);
  const { client } = useAuth();
  const toast = useToast();
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  async function confirmCancel() {
    setBusy(true);
    setError('');
    try {
      await client.post(`/orders/${cancelling.id}/cancel`, {});
      toast.show(t('orders.cancelled'));
      setCancelling(null);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(
        t(`orders.errors.${err.code}`, { defaultValue: '' }) || t(`common:${errorMessageKey(err)}`),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={t('orders.title')} showBack={false}>
      <FormAlert message={error} />
      <OrderList key={version} onCancel={setCancelling} />
      {cancelling && (
        <ConfirmSheet
          open
          tone="danger"
          confirmIcon={XCircle}
          title={t('orders.cancelTitle')}
          message={t('orders.cancelMessage')}
          confirmLabel={t('orders.cancelConfirm')}
          loading={busy}
          onCancel={() => setCancelling(null)}
          onConfirm={confirmCancel}
        />
      )}
    </Screen>
  );
}
