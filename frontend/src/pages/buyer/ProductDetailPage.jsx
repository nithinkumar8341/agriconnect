import { ArrowRight, CircleAlert, MapPin, ShoppingCart, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { toCartItem, useCart } from '../../cart/cartContext.js';
import { DistanceText } from '../../components/buyer/MarketProductCard.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  ErrorState,
  QuantityStepper,
  SkeletonList,
  useToast,
} from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { useBuyerLocationParams } from '../../hooks/useBuyerLocationParams.js';
import { formatDate, formatQuantity, formatRupees, localName } from '../../lib/format.js';

export function DetailRow({ label, children }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 border-b border-soil-100 py-2 last:border-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const language = i18n.language;
  const { client } = useAuth();
  const query = useBuyerLocationParams();
  const request = useApiRequest(
    (signal) => client.get(`/market/products/${id}?${query}`, { signal }),
    `${id}?${query}`,
  );

  if (request.loading) {
    return (
      <Screen title={t('product.title')}>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (request.error) {
    return (
      <Screen title={t('product.title')}>
        <ErrorState error={request.error} onRetry={request.reload} />
      </Screen>
    );
  }

  const { product } = request.data;
  const unit = t(`common:units.${product.unit}`);
  const cropName = localName(product.crop?.names, language);

  return (
    <Screen title={cropName}>
      {product.photos.length > 0 ? (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
          {product.photos.map((photo, index) => (
            <li key={photo.url} className="w-[85%] shrink-0 snap-center">
              <img
                src={photo.url}
                alt={`${cropName} ${index + 1}/${product.photos.length}`}
                className="aspect-[4/3] w-full rounded-2xl object-cover"
              />
            </li>
          ))}
        </ul>
      ) : (
        <span
          aria-hidden="true"
          className="grid aspect-[4/3] place-items-center rounded-2xl bg-leaf-50 text-7xl"
        >
          {product.crop?.icon}
        </span>
      )}

      <section className="flex flex-col gap-1">
        <p className="text-3xl font-bold text-leaf-800">
          {t('card.price', { price: formatRupees(product.pricePerUnit, language), unit })}
        </p>
        <p className="text-lg">
          {product.status === 'out_of_stock'
            ? t('card.outOfStock')
            : t('product.available', {
                quantity: formatQuantity(product.availableQuantity, language),
                unit,
              })}
        </p>
        <p className="text-lg text-ink-muted">
          {t('product.harvested', { date: formatDate(product.harvestDate, language) })}
        </p>
      </section>

      {!product.canDeliver && (
        <p className="flex items-start gap-2 rounded-2xl bg-sun-100 px-4 py-3 text-lg font-semibold">
          <CircleAlert aria-hidden="true" className="mt-1 size-5 shrink-0" />
          {t('product.cannotDeliver')}
        </p>
      )}

      <section className="flex flex-col gap-2 rounded-2xl border-2 border-soil-200 bg-white p-4">
        <h2 className="text-lg text-ink-muted">{t('product.soldBy')}</h2>
        <p className="text-xl font-bold">
          {t('card.from', { name: product.farmer.firstName, village: product.farmer.village })}
        </p>
        {product.distanceKm !== null && (
          <p className="flex items-center gap-2 text-lg">
            <MapPin aria-hidden="true" className="size-5 shrink-0" />
            <DistanceText km={product.distanceKm} />
          </p>
        )}
        <dl className="text-lg">
          {product.nextDeliveryDate && (
            <DetailRow label={t('product.nextDelivery')}>
              {formatDate(product.nextDeliveryDate, language)}
            </DetailRow>
          )}
          <DetailRow label={t('product.deliveryDays')}>
            {product.deliveryDays.map((day) => t(`common:weekdays.${day}`)).join(', ')}
          </DetailRow>
          <DetailRow label={t('product.deliveryFee')}>
            {formatRupees(product.deliveryFee, language)}
          </DetailRow>
          <DetailRow label={t('product.minOrder')}>
            {formatRupees(product.minOrderValue, language)}
          </DetailRow>
        </dl>
        <Link
          to={`/buyer/farmers/${product.farmer.id}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-leaf-700 font-semibold text-leaf-800 hover:bg-leaf-50"
        >
          <UserRound aria-hidden="true" className="size-5" />
          {t('product.seeFarmer')}
        </Link>
      </section>

      {product.canDeliver && product.status === 'available' && (
        <AddToCart product={product} unit={unit} />
      )}
    </Screen>
  );
}

// Quantity in the crop's own steps (never more than is left), then one big Add button.
function AddToCart({ product, unit }) {
  const { t, i18n } = useTranslation('buyer');
  const cart = useCart();
  const toast = useToast();
  const step = product.crop?.quantityStep ?? 1;
  const [quantity, setQuantity] = useState(Math.min(step, product.availableQuantity));
  const inCart = cart.items.find((item) => item.productId === product.id);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white p-4">
      <QuantityStepper
        label={t('product.quantity')}
        value={quantity}
        onChange={setQuantity}
        step={step}
        min={step}
        max={product.availableQuantity}
        unitLabel={unit}
      />
      <BigButton
        icon={ShoppingCart}
        onClick={() => {
          cart.add(toCartItem(product, quantity));
          toast.show(t('product.added'));
        }}
      >
        {t('product.addToCart')}
      </BigButton>
      {inCart && (
        <>
          <p className="text-center text-lg text-ink-muted">
            {t('product.inCart', {
              quantity: formatQuantity(inCart.quantity, i18n.language),
              unit,
            })}
          </p>
          <BigButton icon={ArrowRight} variant="secondary" to="/buyer/cart">
            {t('product.goToCart')}
          </BigButton>
        </>
      )}
    </section>
  );
}
