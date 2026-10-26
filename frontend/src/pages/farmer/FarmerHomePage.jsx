import {
  ClipboardList,
  IndianRupee,
  MessageCircleQuestion,
  PackageMinus,
  Phone,
  ShoppingBag,
  TrendingUp,
  Truck,
  Wheat,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { NotificationBell } from '../../components/NotificationBell.jsx';
import { Screen } from '../../components/Screen.jsx';
import { ErrorState, IconTile, Skeleton } from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { formatQuantity, localName } from '../../lib/format.js';

const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE;

// Full-width rows rather than three narrow columns: Telugu labels are long and broke mid-word
// in a third of a 360px screen.
function SummaryCard({ to, icon: Icon, label, value, highlight }) {
  return (
    <Link
      to={to}
      aria-label={`${label}: ${value}`}
      className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-2 ${
        highlight ? 'border-sun-400 bg-sun-100' : 'border-soil-200 bg-white'
      }`}
    >
      <Icon aria-hidden="true" className="size-7 shrink-0 text-leaf-700" />
      <span className="flex-1 text-lg leading-snug font-semibold">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
    </Link>
  );
}

// Farmer home: today's numbers first (each opens the matching list), then one tile per task.
// Every farmer task is one tap from here or from the bottom menu.
export function FarmerHomePage() {
  const { t, i18n } = useTranslation(['farmer', 'common']);
  const { client } = useAuth();
  const dashboard = useApiRequest(
    (signal) => client.get('/farmer/dashboard', { signal }),
    'farmer-dashboard',
  );
  const data = dashboard.data;

  function agentTile() {
    if (data?.agent) {
      return (
        <IconTile icon={Phone} label={t('tiles.callAgent')} href={`tel:${data.agent.phone}`} />
      );
    }
    if (SUPPORT_PHONE) {
      return <IconTile icon={Phone} label={t('tiles.callSupport')} href={`tel:${SUPPORT_PHONE}`} />;
    }
    return (
      <IconTile icon={Phone} label={t('tiles.callAgent')} disabled hint={t('tiles.noAgent')} />
    );
  }

  return (
    <Screen
      title={t('common:home.title')}
      showBack={false}
      actions={<NotificationBell to="/farmer/notifications" />}
    >
      <h2 className="text-2xl font-bold">
        {data?.farmerName
          ? t('home.greeting', { name: data.farmerName })
          : t('home.greetingNoName')}
      </h2>

      <section aria-labelledby="glance" className="flex flex-col gap-3">
        <h3 id="glance" className="text-lg font-semibold text-ink-muted">
          {t('home.glance')}
        </h3>
        {dashboard.loading && (
          <div role="status" className="flex flex-col gap-2">
            <span className="sr-only">{t('common:status.loading')}</span>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}
        {dashboard.error && <ErrorState error={dashboard.error} onRetry={dashboard.reload} />}
        {data && (
          <>
            <div className="flex flex-col gap-2">
              <SummaryCard
                to="/farmer/orders"
                icon={ShoppingBag}
                label={t('home.todayOrders')}
                value={data.orders.today}
              />
              <SummaryCard
                to="/farmer/orders"
                icon={Truck}
                label={t('home.pendingDeliveries')}
                value={data.orders.pendingDelivery}
              />
              <SummaryCard
                to="/farmer/products?status=low"
                icon={PackageMinus}
                label={t('home.lowStock')}
                value={data.lowStock.length}
                highlight={data.lowStock.length > 0}
              />
            </div>
            {data.lowStock.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-2xl bg-sun-100 px-4 py-3 text-lg">
                {data.lowStock.map((item) => (
                  <li key={item.id}>
                    <span aria-hidden="true">{item.crop?.icon} </span>
                    {t('home.lowItem', {
                      crop: localName(item.crop?.names, i18n.language),
                      left: formatQuantity(item.availableQuantity, i18n.language),
                      unit: t(`common:units.${item.unit}`),
                    })}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="tasks" className="flex flex-col gap-3">
        <h3 id="tasks" className="text-lg font-semibold text-ink-muted">
          {t('home.tasks')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <IconTile icon={Wheat} label={t('tiles.sell')} to="/farmer/sell" />
          <IconTile icon={ClipboardList} label={t('tiles.products')} to="/farmer/products" />
          <IconTile
            icon={ShoppingBag}
            label={t('tiles.orders')}
            to="/farmer/orders"
            badge={data?.orders.new ?? 0}
            badgeLabel={t('tiles.newOrders')}
          />
          <IconTile icon={IndianRupee} label={t('tiles.earnings')} to="/farmer/earnings" />
          <IconTile icon={TrendingUp} label={t('tiles.prices')} to="/farmer/prices" />
          <IconTile
            icon={MessageCircleQuestion}
            label={t('tiles.assistant')}
            disabled
            hint={t('common:comingSoon.title')}
          />
          {agentTile()}
        </div>
      </section>
    </Screen>
  );
}
