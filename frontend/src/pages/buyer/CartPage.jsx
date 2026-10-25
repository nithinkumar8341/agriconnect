import { Banknote, CircleAlert, MapPin, Send, ShoppingCart, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { useCart } from '../../cart/cartContext.js';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  EmptyState,
  ErrorState,
  PresetChips,
  QuantityStepper,
  SkeletonList,
  useToast,
} from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { formatQuantity, formatRupees, localName } from '../../lib/format.js';
import { DetailRow } from './ProductDetailPage.jsx';

// "Wed, 28 Oct" for a YYYY-MM-DD delivery day (an Indian calendar day).
function formatDay(date, language) {
  return new Intl.DateTimeFormat(`${language}-IN`, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${date}T00:00:00+05:30`));
}

function ChangesNotice({ changes, cartItems, onAccept }) {
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const language = i18n.language;
  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border-2 border-sun-400 bg-sun-100 p-4"
    >
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <CircleAlert aria-hidden="true" className="size-6 shrink-0" />
        {t('cart.changedTitle')}
      </h2>
      <ul className="flex list-disc flex-col gap-1 pl-6 text-lg">
        {changes.map((change) => {
          const item = cartItems.find((i) => i.productId === change.productId);
          return (
            <li key={`${change.productId}:${change.kind}`}>
              {t(`cart.changes.${change.kind}`, {
                crop: localName(item?.cropNames, language),
                old: formatRupees(change.old ?? 0, language),
                new: formatRupees(change.new ?? 0, language),
                available: formatQuantity(change.available ?? 0, language),
                unit: item ? t(`common:units.${item.unit}`) : '',
              })}
            </li>
          );
        })}
      </ul>
      <BigButton onClick={onAccept}>{t('cart.acceptChanges')}</BigButton>
    </section>
  );
}

function FarmerGroup({ group, chosenDate, onChooseDate }) {
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const language = i18n.language;
  const cart = useCart();
  const money = (paise) => formatRupees(paise, language);
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl border-2 border-soil-200 bg-white p-4"
    >
      <h2 id={headingId} className="text-xl font-bold">
        {t('cart.from', { name: group.farmer.firstName, village: group.farmer.village })}
      </h2>
      <ul className="flex flex-col gap-4">
        {group.items.map((line) => {
          const item = cart.items.find((i) => i.productId === line.productId);
          const crop = localName(line.crop?.names, language);
          const unit = t(`common:units.${line.unit}`);
          return (
            <li key={line.productId} className="flex flex-col gap-2 border-b border-soil-100 pb-4">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-3xl">
                  {line.crop?.icon}
                </span>
                <span className="flex-1 text-lg font-bold">{crop}</span>
                <button
                  type="button"
                  onClick={() => cart.remove(line.productId)}
                  aria-label={t('cart.remove', { crop })}
                  className="grid size-12 place-items-center rounded-xl text-danger-700 hover:bg-danger-50"
                >
                  <Trash2 aria-hidden="true" className="size-6" />
                </button>
              </div>
              <QuantityStepper
                label={`${crop}: ${t('card.price', { price: money(line.pricePerUnit), unit })}`}
                value={item?.quantity ?? line.quantity}
                onChange={(quantity) => cart.setQuantity(line.productId, quantity)}
                step={line.quantityStep}
                min={line.quantityStep}
                max={line.availableQuantity}
                unitLabel={unit}
              />
              <p className="text-right text-lg font-semibold">{money(line.lineTotal)}</p>
            </li>
          );
        })}
      </ul>
      {!group.meetsMinimum && (
        <p className="rounded-xl bg-sun-100 px-3 py-2 text-lg font-semibold">
          {t('cart.belowMinimum', {
            amount: money(group.minOrderValue - group.priceBreakdown.itemsTotal),
            minimum: money(group.minOrderValue),
          })}
        </p>
      )}
      <PresetChips
        label={t('cart.deliveryDay')}
        options={group.deliveryDates}
        value={chosenDate}
        onChange={onChooseDate}
        formatOption={(date) => formatDay(date, language)}
      />
      <dl className="text-lg">
        <DetailRow label={t('cart.itemTotal')}>{money(group.priceBreakdown.itemsTotal)}</DetailRow>
        <DetailRow label={t('cart.deliveryFee')}>
          {money(group.priceBreakdown.deliveryFee)}
        </DetailRow>
        <DetailRow label={t('cart.farmerTotal')}>
          {money(group.priceBreakdown.buyerTotal)}
        </DetailRow>
      </dl>
    </section>
  );
}

// Cart grouped by farmer. Everything shown comes from the server's quote (prices, stock, fees,
// delivery days), and placing the order re-checks it all again.
export function CartPage() {
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const language = i18n.language;
  const { client } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const [chosenDates, setChosenDates] = useState({});
  // One idempotency key per attempt at this exact cart, reused if the buyer taps again or
  // retries after a network error, so the same checkout can never create orders twice.
  const [attempt, setAttempt] = useState({ cartKey: null, id: null });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const items = cart.items.map(({ productId, quantity, pricePerUnit }) => ({
    productId,
    quantity,
    pricePerUnit,
  }));
  const cartKey = JSON.stringify(items);
  const quote = useApiRequest(
    (signal) =>
      items.length ? client.post('/checkout/quote', { items }, { signal }) : Promise.resolve(null),
    cartKey,
  );
  // Keep showing the last quote while a new one loads, so changing a quantity does not flash.
  const [lastQuote, setLastQuote] = useState(null);
  if (quote.data && quote.data !== lastQuote) setLastQuote(quote.data);
  const shown = quote.data ?? lastQuote;

  if (cart.count === 0) {
    return (
      <Screen title={t('cart.title')} showBack={false}>
        <EmptyState
          icon={ShoppingCart}
          title={t('cart.emptyTitle')}
          message={t('cart.emptyMessage')}
          action={
            <BigButton icon={ShoppingCart} to="/buyer">
              {t('cart.browse')}
            </BigButton>
          }
        />
      </Screen>
    );
  }
  if (!shown && !quote.error) {
    return (
      <Screen title={t('cart.title')} showBack={false}>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (quote.error) {
    return (
      <Screen title={t('cart.title')} showBack={false}>
        <ErrorState error={quote.error} onRetry={quote.reload} />
      </Screen>
    );
  }

  const { groups, totals, address, changes } = shown;
  const dateFor = (group) =>
    group.deliveryDates.includes(chosenDates[group.farmer.id])
      ? chosenDates[group.farmer.id]
      : group.deliveryDates[0];
  const platformFee = groups.reduce((sum, g) => sum + g.priceBreakdown.platformFee, 0);
  const canPlace = changes.length === 0 && groups.length > 0 && groups.every((g) => g.meetsMinimum);

  async function placeOrder() {
    const idempotencyKey = attempt.cartKey === cartKey ? attempt.id : crypto.randomUUID();
    setAttempt({ cartKey, id: idempotencyKey });
    setPlacing(true);
    setError('');
    try {
      await client.post('/checkout', {
        idempotencyKey,
        paymentMethod: 'cod',
        items,
        deliveryDates: Object.fromEntries(groups.map((g) => [g.farmer.id, dateFor(g)])),
      });
      cart.clear();
      toast.show(t('cart.placed'));
      navigate('/buyer/orders');
    } catch (err) {
      setPlacing(false);
      if (err.code === 'CART_CHANGED') {
        quote.reload();
        return;
      }
      setError(
        t(`cart.errors.${err.code}`, {
          limit: formatRupees(err.details?.limit ?? 0, language),
          defaultValue: '',
        }) || t(`common:${errorMessageKey(err)}`),
      );
    }
  }

  return (
    <Screen title={t('cart.title')} showBack={false}>
      {changes.length > 0 && (
        <ChangesNotice
          changes={changes}
          cartItems={cart.items}
          onAccept={() => cart.syncWithQuote(shown)}
        />
      )}
      {groups.map((group) => (
        <FarmerGroup
          key={group.farmer.id}
          group={group}
          chosenDate={dateFor(group)}
          onChooseDate={(date) =>
            setChosenDates((current) => ({ ...current, [group.farmer.id]: date }))
          }
        />
      ))}

      <section className="flex flex-col gap-2 rounded-2xl bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg text-ink-muted">
          <MapPin aria-hidden="true" className="size-5" />
          {t('cart.deliverTo')}
        </h2>
        <p className="text-lg font-semibold">
          {[address.landmark, address.area, address.pincode].filter(Boolean).join(', ')}
        </p>
        <h2 className="mt-2 flex items-center gap-2 text-lg text-ink-muted">
          <Banknote aria-hidden="true" className="size-5" />
          {t('cart.payment')}
        </h2>
        <p className="text-lg font-semibold">{t('cart.cod')}</p>
        <p className="text-base text-ink-muted">{t('cart.upiSoon')}</p>
      </section>

      <section className="rounded-2xl bg-white p-4">
        <h2 className="text-xl font-bold">{t('cart.summary')}</h2>
        <dl className="text-lg">
          <DetailRow label={t('cart.itemsTotal')}>
            {formatRupees(totals.itemsTotal, language)}
          </DetailRow>
          <DetailRow label={t('cart.deliveryTotal')}>
            {formatRupees(totals.deliveryFee, language)}
          </DetailRow>
          <DetailRow label={t('cart.platformFee')}>{formatRupees(platformFee, language)}</DetailRow>
          <DetailRow label={t('cart.grandTotal')}>
            <span className="text-2xl">{formatRupees(totals.buyerTotal, language)}</span>
          </DetailRow>
        </dl>
      </section>

      <FormAlert message={error} />
      <BigButton
        icon={Send}
        loading={placing || quote.loading}
        disabled={!canPlace}
        onClick={placeOrder}
      >
        {t('cart.placeOrder')}
      </BigButton>
    </Screen>
  );
}
