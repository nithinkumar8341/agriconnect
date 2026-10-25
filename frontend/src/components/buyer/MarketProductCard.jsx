import { CalendarDays, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatDate, formatRupees, localName } from '../../lib/format.js';

export function DistanceText({ km }) {
  const { t } = useTranslation('buyer');
  if (km === null || km === undefined) return null;
  return km === 0 ? t('card.under1') : t('card.km', { km });
}

// A listing as buyers see it: photo, price, approximate distance, farmer and next delivery day.
export function MarketProductCard({ product }) {
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const language = i18n.language;
  const cropName = localName(product.crop?.names, language);

  return (
    <Link
      to={`/buyer/products/${product.id}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-soil-200 bg-white hover:border-leaf-600"
    >
      {product.photoUrl ? (
        <img
          src={product.photoUrl}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid aspect-[4/3] w-full place-items-center bg-leaf-50 text-5xl"
        >
          {product.crop?.icon}
        </span>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-lg leading-tight font-bold">{cropName}</h3>
        <p className="text-lg font-semibold text-leaf-800">
          {t('card.price', {
            price: formatRupees(product.pricePerUnit, language),
            unit: t(`common:units.${product.unit}`),
          })}
        </p>
        {product.status === 'out_of_stock' && (
          <p className="self-start rounded-full bg-soil-100 px-2 text-base font-semibold">
            {t('card.outOfStock')}
          </p>
        )}
        <p className="text-base text-ink-muted">
          {t('card.from', { name: product.farmer.firstName, village: product.farmer.village })}
        </p>
        {product.distanceKm !== null && (
          <p className="flex items-center gap-1 text-base">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <DistanceText km={product.distanceKm} />
          </p>
        )}
        {product.nextDeliveryDate && (
          <p className="flex items-center gap-1 text-base">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            {t('card.delivery', { date: formatDate(product.nextDeliveryDate, language) })}
          </p>
        )}
      </div>
    </Link>
  );
}
