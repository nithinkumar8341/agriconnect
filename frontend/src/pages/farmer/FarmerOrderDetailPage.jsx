import { Check, CircleX, MapPinned, PackageCheck, Phone, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { TextField } from '../../components/form/TextField.jsx';
import { OrderTimeline } from '../../components/orders/OrderTimeline.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  BottomSheet,
  ErrorState,
  PresetChips,
  SkeletonList,
  useToast,
} from '../../components/ui/index.js';
import { useLiveOrder } from '../../hooks/useLiveOrder.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { formatDate, formatQuantity, formatRupees, localName } from '../../lib/format.js';
import { ORDER_STATUS_STYLES } from '../../lib/orderStatus.js';

const REASONS = {
  reject: ['stock', 'quality', 'distance', 'day'],
  fail: ['not_home', 'refused', 'no_code', 'vehicle'],
};

// Tap a common reason (in the farmer's language) or type one.
function ReasonSheet({ action, busy, error, onClose, onConfirm }) {
  const { t } = useTranslation('farmer');
  const group = action === 'reject' ? 'rejectReasons' : 'failReasons';
  const [choice, setChoice] = useState(null);
  const [typed, setTyped] = useState('');
  const reason = typed.trim() || (choice ? t(`orders.${group}.${choice}`) : '');

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={t(action === 'reject' ? 'orders.rejectTitle' : 'orders.failTitle')}
    >
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pb-2">
        <PresetChips
          label={t('orders.reasonLabel')}
          options={REASONS[action]}
          value={choice}
          onChange={setChoice}
          formatOption={(key) => t(`orders.${group}.${key}`)}
        />
        <TextField
          label={t('orders.otherReason')}
          value={typed}
          maxLength={300}
          onChange={(event) => setTyped(event.target.value)}
        />
        <FormAlert message={error} />
        <BigButton
          icon={Check}
          variant="danger"
          loading={busy}
          disabled={!reason}
          onClick={() => onConfirm(reason)}
        >
          {t('orders.confirm')}
        </BigButton>
      </div>
    </BottomSheet>
  );
}

const mapsLink = ({ latitude, longitude }) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

// One order for the farmer, with the one next step as a big button: accept, set out, then enter
// the buyer's code at handover. Reject and "could not deliver" ask for a reason.
export function FarmerOrderDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation(['farmer', 'common']);
  const language = i18n.language;
  const { client } = useAuth();
  const toast = useToast();
  const live = useLiveOrder(id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reasonFor, setReasonFor] = useState(null);
  const [code, setCode] = useState('');
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
  const can = (action) => order.actions.includes(action);

  async function run(action, body = {}) {
    setBusy(true);
    setError('');
    try {
      live.replace((await client.post(`/orders/${order.id}/${action}`, body)).order);
      toast.show(t(`orders.done.${action}`));
      setReasonFor(null);
      setCode('');
    } catch (err) {
      if (err.code === 'INVALID_STATUS_CHANGE') live.reload();
      setError(
        t(`orders.errors.${err.code}`, {
          attemptsLeft: err.details?.attemptsLeft ?? 0,
          defaultValue: '',
        }) || t(`common:${errorMessageKey(err)}`),
      );
      if (err.code === 'DELIVERY_OTP_LOCKED') live.reload();
    } finally {
      setBusy(false);
    }
  }

  const { address } = order.delivery;
  return (
    <Screen title={t('orders.detailTitle')}>
      <p
        role="status"
        className={`rounded-2xl px-4 py-4 text-center text-2xl font-bold ${ORDER_STATUS_STYLES[order.status]}`}
      >
        {t(`orders.status.${order.status}`)}
      </p>

      <section className="flex flex-col gap-2 rounded-2xl border-2 border-soil-200 bg-white p-4">
        <p className="text-xl font-bold">
          {t('orders.deliverOn', { date: formatDate(order.delivery.date, language) })}
        </p>
        <ul className="text-lg">
          {order.items.map((item) => (
            <li key={item.productId}>
              {localName(item.cropName, language)} · {formatQuantity(item.quantity, language)}{' '}
              {t(`common:units.${item.unit}`)}
            </li>
          ))}
        </ul>
        <p className="text-xl font-semibold text-leaf-800">
          {t('orders.youGet', { amount: money(order.priceBreakdown.farmerEarnings) })}
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl bg-white p-4">
        <h2 className="text-lg text-ink-muted">{t('orders.buyer')}</h2>
        <p className="text-xl font-bold">{order.buyer.name ?? order.buyer.firstName}</p>
        <p className="text-lg">
          {[address.houseAndStreet, address.landmark, address.area, address.pincode]
            .filter(Boolean)
            .join(', ')}
        </p>
        {order.buyer.phone ? (
          <BigButton icon={Phone} variant="secondary" href={`tel:${order.buyer.phone}`}>
            {t('orders.callBuyer', { name: order.buyer.firstName })}
          </BigButton>
        ) : (
          order.status === 'placed' && (
            <p className="text-base text-ink-muted">{t('orders.addressAfterAccept')}</p>
          )
        )}
        {address.location && (
          <BigButton
            icon={MapPinned}
            variant="secondary"
            href={mapsLink(address.location)}
            target="_blank"
            rel="noreferrer"
          >
            {t('orders.openMap')}
          </BigButton>
        )}
      </section>

      <FormAlert message={reasonFor ? '' : error} />

      {can('accept') && (
        <BigButton icon={Check} loading={busy} onClick={() => run('accept')}>
          {t('orders.actions.accept')}
        </BigButton>
      )}
      {can('dispatch') && (
        <BigButton icon={Truck} loading={busy} onClick={() => run('dispatch')}>
          {t('orders.actions.dispatch')}
        </BigButton>
      )}
      {can('deliver') && !order.deliveryOtpLocked && (
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-leaf-700 bg-leaf-50 p-4">
          <TextField
            label={t('orders.codeLabel')}
            hint={t('orders.codeHint')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
          <BigButton
            icon={PackageCheck}
            loading={busy}
            disabled={code.length !== 4}
            onClick={() => run('deliver', { code })}
          >
            {t('orders.actions.deliver')}
          </BigButton>
        </section>
      )}
      {can('deliver') && order.deliveryOtpLocked && (
        <p
          role="alert"
          className="rounded-2xl bg-danger-50 px-4 py-3 text-lg font-semibold text-danger-800"
        >
          {t('orders.errors.DELIVERY_OTP_LOCKED')}
        </p>
      )}
      {can('reject') && (
        <BigButton icon={XCircle} variant="secondary" onClick={() => setReasonFor('reject')}>
          {t('orders.actions.reject')}
        </BigButton>
      )}
      {can('fail') && (
        <BigButton icon={CircleX} variant="secondary" onClick={() => setReasonFor('fail')}>
          {t('orders.actions.fail')}
        </BigButton>
      )}

      <OrderTimeline
        history={order.statusHistory}
        labelFor={(status) => t(`orders.status.${status}`)}
      />

      {reasonFor && (
        <ReasonSheet
          action={reasonFor}
          busy={busy}
          error={error}
          onClose={() => {
            setReasonFor(null);
            setError('');
          }}
          onConfirm={(reason) => run(reasonFor, { reason })}
        />
      )}
    </Screen>
  );
}
