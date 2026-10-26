import { CalendarDays, ChevronDown, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  EmptyState,
  ErrorState,
  PresetChips,
  SkeletonList,
} from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { usePolling } from '../../hooks/usePolling.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { formatDate, formatQuantity, formatRupees, localName } from '../../lib/format.js';
import { ORDER_STATUS_STYLES } from '../../lib/orderStatus.js';

const TABS = ['new', 'active', 'done'];
const PAGE_SIZE = 20;
const ordersPath = (tab, page) => `/orders/farmer?status=${tab}&page=${page}&limit=${PAGE_SIZE}`;

function FarmerOrderCard({ order }) {
  const { t, i18n } = useTranslation(['farmer', 'common']);
  const language = i18n.language;
  return (
    <Link
      to={`/farmer/orders/${order.id}`}
      className="flex flex-col gap-2 rounded-2xl border-2 border-soil-200 bg-white p-4 hover:border-leaf-600"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold">
          {order.buyer.firstName}
          {order.delivery.address.area && ` · ${order.delivery.address.area}`}
        </h3>
        <span
          className={`self-start rounded-full px-3 py-1 text-base font-semibold ${ORDER_STATUS_STYLES[order.status]}`}
        >
          {t(`orders.status.${order.status}`)}
        </span>
      </div>
      <p className="text-lg">
        {order.items
          .map(
            (item) =>
              `${localName(item.cropName, language)} ${formatQuantity(item.quantity, language)} ${t(`common:units.${item.unit}`)}`,
          )
          .join(', ')}
      </p>
      <p className="flex items-center gap-2 text-lg">
        <CalendarDays aria-hidden="true" className="size-5 shrink-0" />
        {t('orders.deliverOn', { date: formatDate(order.delivery.date, language) })}
      </p>
      <p className="text-lg font-semibold text-leaf-800">
        {t('orders.youGet', {
          amount: formatRupees(order.priceBreakdown.farmerEarnings, language),
        })}
      </p>
    </Link>
  );
}

function OrderList({ tab }) {
  const { t } = useTranslation(['farmer', 'common']);
  const { client } = useAuth();
  const first = useApiRequest((signal) => client.get(ordersPath(tab, 1), { signal }), tab);
  const [more, setMore] = useState({ items: [], page: 1, loading: false, error: '' });
  // New orders should appear without the farmer having to pull to refresh.
  usePolling(first.reload, 30_000, tab !== 'done' && more.page === 1);

  async function loadMore() {
    setMore((c) => ({ ...c, loading: true, error: '' }));
    try {
      const next = await client.get(ordersPath(tab, more.page + 1));
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

  if (!first.data) {
    return first.error ? (
      <ErrorState error={first.error} onRetry={first.reload} />
    ) : (
      <SkeletonList rows={3} />
    );
  }
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
            <FarmerOrderCard order={order} />
          </li>
        ))}
      </ul>
      <FormAlert message={more.error} />
      {all.length < first.data.total && (
        <BigButton icon={ChevronDown} variant="secondary" loading={more.loading} onClick={loadMore}>
          {t('products.loadMore')}
        </BigButton>
      )}
    </div>
  );
}

// Farmer orders in three tabs: new (decide), to deliver (accepted / on the way), finished.
export function FarmerOrdersPage() {
  const { t } = useTranslation('farmer');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'new';

  return (
    <Screen title={t('orders.title')} showBack={false}>
      <PresetChips
        label={t('products.filterLabel')}
        options={TABS}
        value={tab}
        onChange={(next) => setSearchParams({ tab: next }, { replace: true })}
        formatOption={(name) => t(`orders.tabs.${name}`)}
      />
      <OrderList key={tab} tab={tab} />
    </Screen>
  );
}
