import { ClipboardList, ShieldAlert, Undo2, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  EmptyState,
  ErrorState,
  IconTile,
  PresetChips,
  SkeletonList,
  useToast,
} from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { formatDate, formatRupees, localName } from '../../lib/format.js';

// Shared by every admin list: loads `path`, shows loading/error/empty states, renders each item,
// and gives renderItem an `act(path, body)` helper that posts an action and reloads the list.
function AdminList({ path, renderItem }) {
  const { t } = useTranslation('common');
  const { client } = useAuth();
  const toast = useToast();
  const list = useApiRequest((signal) => client.get(path, { signal }), path);
  const [error, setError] = useState('');

  async function act(actionPath, body) {
    setError('');
    try {
      await client.post(actionPath, body);
      toast.show(t('admin.done'));
      list.reload();
    } catch (err) {
      setError(t(errorMessageKey(err)));
    }
  }

  if (list.loading) return <SkeletonList rows={4} />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (list.data.items.length === 0)
    return <EmptyState icon={ClipboardList} title={t('admin.empty')} />;
  return (
    <div className="flex flex-col gap-3">
      <FormAlert message={error} />
      <ul className="flex flex-col gap-3">
        {list.data.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-2xl border-2 border-soil-200 bg-white p-4"
          >
            {renderItem(item, act)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminHomePage() {
  const { t } = useTranslation('common');
  return (
    <Screen title={t('admin.homeTitle')} showBack={false}>
      <div className="grid grid-cols-2 gap-3">
        <IconTile icon={Users} label={t('admin.users')} to="/admin/users" />
        <IconTile icon={ClipboardList} label={t('admin.orders')} to="/admin/orders" />
        <IconTile icon={ShieldAlert} label={t('admin.flags')} to="/admin/fraud-flags" />
        <IconTile icon={Undo2} label={t('admin.returns')} to="/admin/returns" />
      </div>
    </Screen>
  );
}

export function AdminUsersPage() {
  const { t } = useTranslation('common');
  const [role, setRole] = useState('all');
  const query = role === 'all' ? '' : `&role=${role}`;
  return (
    <Screen title={t('admin.users')} showBack={false}>
      <PresetChips
        label={t('admin.users')}
        options={['all', 'farmer', 'buyer', 'agent']}
        value={role}
        onChange={setRole}
        formatOption={(r) => (r === 'all' ? t('admin.all') : t(`roles.${r}`))}
      />
      <AdminList
        key={role}
        path={`/admin/users?limit=50${query}`}
        renderItem={(user, act) => (
          <>
            <p className="text-lg font-bold">
              {user.name ?? '—'} · {t(`roles.${user.role}`)}
            </p>
            <p className="text-base text-ink-muted">
              {user.phone} · {t('admin.status', { status: user.status })}
            </p>
            {user.role !== 'admin' && (
              <BigButton
                variant={user.status === 'active' ? 'danger' : 'secondary'}
                onClick={() =>
                  act(`/admin/users/${user.id}/status`, {
                    status: user.status === 'active' ? 'suspended' : 'active',
                  })
                }
              >
                {user.status === 'active' ? t('admin.suspend') : t('admin.activate')}
              </BigButton>
            )}
          </>
        )}
      />
    </Screen>
  );
}

export function AdminOrdersPage() {
  const { t, i18n } = useTranslation(['common', 'buyer']);
  const [status, setStatus] = useState('all');
  const statuses = [
    'all',
    'placed',
    'accepted',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'rejected',
    'failed',
  ];
  return (
    <Screen title={t('admin.orders')} showBack={false}>
      <PresetChips
        label={t('admin.orders')}
        options={statuses}
        value={status}
        onChange={setStatus}
        formatOption={(s) => (s === 'all' ? t('admin.all') : t(`buyer:orders.status.${s}`))}
      />
      <AdminList
        key={status}
        path={`/admin/orders?limit=50${status === 'all' ? '' : `&status=${status}`}`}
        renderItem={(order) => (
          <>
            <p className="text-lg font-bold">
              {t('admin.orderLine', {
                name: order.buyerName,
                amount: formatRupees(order.buyerTotal, i18n.language),
                status: t(`buyer:orders.status.${order.status}`),
              })}
            </p>
            <p className="text-base text-ink-muted">
              {order.paymentMethod} · {order.paymentStatus} · {order.pincode} ·{' '}
              {formatDate(order.createdAt, i18n.language)}
            </p>
          </>
        )}
      />
    </Screen>
  );
}

export function AdminFraudFlagsPage() {
  const { t, i18n } = useTranslation(['common', 'buyer']);
  return (
    <Screen title={t('admin.flags')}>
      <AdminList
        path="/admin/fraud-flags?limit=50"
        renderItem={(flag, act) => (
          <>
            <p className="text-lg font-bold">
              {flag.ruleId} · {flag.severity}
            </p>
            {flag.ruleId === 'duplicate_address' && (
              <p className="text-lg">{t('admin.accounts', flag.evidence)}</p>
            )}
            {flag.order && (
              <p className="text-base text-ink-muted">
                {t('admin.orderLine', {
                  name: flag.order.buyerName,
                  amount: formatRupees(flag.order.buyerTotal, i18n.language),
                  status: t(`buyer:orders.status.${flag.order.status}`),
                })}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <BigButton
                variant="secondary"
                onClick={() =>
                  act(`/admin/fraud-flags/${flag.id}/resolve`, { status: 'dismissed' })
                }
              >
                {t('admin.dismiss')}
              </BigButton>
              <BigButton
                onClick={() => act(`/admin/fraud-flags/${flag.id}/resolve`, { status: 'resolved' })}
              >
                {t('admin.resolve')}
              </BigButton>
            </div>
          </>
        )}
      />
    </Screen>
  );
}

export function AdminReturnsPage() {
  const { t, i18n } = useTranslation(['common', 'buyer']);
  return (
    <Screen title={t('admin.returns')}>
      <AdminList
        path="/admin/returns?limit=50"
        renderItem={(request, act) => (
          <>
            <p className="text-lg font-bold">
              {t('admin.reason', { reason: t(`buyer:returns.reasons.${request.reason}`) })}
            </p>
            {request.order && (
              <p className="text-lg">
                {request.order.buyerName} ·{' '}
                {request.order.items
                  .map((i) => `${localName(i.cropName, i18n.language)} ${i.quantity} ${i.unit}`)
                  .join(', ')}{' '}
                · {formatRupees(request.order.itemsTotal, i18n.language)}
              </p>
            )}
            {request.note && <p className="text-base">“{request.note}”</p>}
            <div className="flex gap-2 overflow-x-auto">
              {request.photos.map((photo) => (
                <img
                  key={photo.url}
                  src={photo.thumbnailUrl}
                  alt=""
                  className="size-24 rounded-xl object-cover"
                />
              ))}
              {request.evidence?.listingPhotoUrls.slice(0, 2).map((url) => (
                <img
                  key={url}
                  src={url}
                  alt={t('admin.listingPhotos')}
                  className="size-24 rounded-xl object-cover opacity-80"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <BigButton
                variant="secondary"
                onClick={() => act(`/admin/returns/${request.id}/resolve`, { decision: 'reject' })}
              >
                {t('admin.reject')}
              </BigButton>
              <BigButton
                onClick={() => act(`/admin/returns/${request.id}/resolve`, { decision: 'approve' })}
              >
                {t('admin.approve')}
              </BigButton>
            </div>
          </>
        )}
      />
    </Screen>
  );
}
