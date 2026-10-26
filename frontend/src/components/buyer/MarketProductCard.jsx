import { Leaf, MapPin, Plus, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toCartItem, useCart } from '../../cart/cartContext.js';
import { formatRupees, localName } from '../../lib/format.js';
import { CropPhoto } from '../CropPhoto.jsx';
import { useToast } from '../ui/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function DistanceText({ km }) {
  const { t } = useTranslation('buyer');
  if (km === null || km === undefined) return null;
  return km === 0 ? t('card.under1') : t('card.km', { km });
}

// Whole days since harvest, by the phone's calendar (harvested today = 0).
function daysSinceHarvest(harvestDate, now = new Date()) {
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(now) - start(new Date(harvestDate))) / DAY_MS);
}

// "Fresh today", or how many more days it keeps (from the crop's shelf life), or nothing.
export function FreshnessTag({ product }) {
  const { t } = useTranslation('buyer');
  if (!product.harvestDate) return null;
  const age = daysSinceHarvest(product.harvestDate);
  const left = (product.crop?.shelfLifeDays ?? 0) - age;
  const text = age <= 0 ? t('card.freshToday') : left > 0 ? t('card.keeps', { days: left }) : null;
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1 self-start rounded-full bg-leaf-50 px-2 py-0.5 text-sm font-semibold text-leaf-800">
      <Leaf aria-hidden="true" className="size-4" />
      {text}
    </span>
  );
}

// "4.3 ★ (28)" from the farmer's reviews, or a "New" badge for farmers nobody has reviewed yet.
export function RatingLine({ rating }) {
  const { t, i18n } = useTranslation('buyer');
  if (!rating?.count) {
    return (
      <span className="self-start rounded-full bg-sun-100 px-2 py-0.5 text-sm font-bold">
        {t('card.new')}
      </span>
    );
  }
  const average = rating.average.toLocaleString(i18n.language, { minimumFractionDigits: 1 });
  return (
    <span
      className="flex items-center gap-1 text-base"
      aria-label={t('card.ratingLabel', { rating: average, count: rating.count })}
    >
      <span className="inline-flex items-center gap-0.5 rounded-md bg-leaf-700 px-1.5 text-sm font-bold text-white">
        {average}
        <Star aria-hidden="true" className="size-3.5 fill-current" />
      </span>
      <span className="text-ink-muted">({rating.count})</span>
    </span>
  );
}

// A listing in the buyer's grid: square photo, name, bold price per unit, rating or "New",
// farmer and distance, freshness, and an Add button that puts one step in the cart.
export function MarketProductCard({ product }) {
  const { t, i18n } = useTranslation(['buyer', 'common']);
  const cart = useCart();
  const toast = useToast();
  const language = i18n.language;
  const cropName = localName(product.crop?.names, language);
  const unit = t(`common:units.${product.unit}`);
  const soldOut = product.status === 'out_of_stock';

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-soil-200 bg-white shadow-sm focus-within:border-leaf-700">
      <Link to={`/buyer/products/${product.id}`} className="flex flex-1 flex-col">
        <CropPhoto
          crop={product.crop}
          photoUrl={product.photoUrl}
          alt={cropName}
          className="aspect-square w-full"
        />
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-lg leading-tight font-semibold">{cropName}</h3>
          <RatingLine rating={product.rating} />
          <p className="text-xl font-bold">
            {formatRupees(product.pricePerUnit, language)}
            <span className="text-base font-semibold text-ink-muted">/{unit}</span>
          </p>
          <p className="flex items-center gap-1 text-sm text-ink-muted">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">
              {product.farmer.firstName}
              {product.distanceKm !== null && product.distanceKm !== undefined && (
                <>
                  {' · '}
                  <DistanceText km={product.distanceKm} />
                </>
              )}
            </span>
          </p>
          {soldOut ? (
            <span className="self-start rounded-full bg-soil-100 px-2 text-sm font-semibold">
              {t('card.outOfStock')}
            </span>
          ) : (
            <FreshnessTag product={product} />
          )}
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          type="button"
          disabled={soldOut}
          aria-label={t('card.addLabel', { crop: cropName })}
          onClick={() => {
            cart.add(toCartItem(product, product.crop?.quantityStep ?? 1));
            toast.show(t('product.added'));
          }}
          className="flex min-h-12 w-full items-center justify-center gap-1 rounded-xl border-2 border-leaf-700 bg-white text-lg font-bold text-leaf-800 hover:bg-leaf-50 disabled:border-soil-200 disabled:text-ink-muted"
        >
          <Plus aria-hidden="true" className="size-5" />
          {t('card.add')}
        </button>
      </div>
    </article>
  );
}

// Card-shaped placeholders while the grid loads.
export function ProductGridSkeleton({ count = 6 }) {
  return (
    <ul aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-soil-200 bg-white">
          <div className="aspect-square w-full animate-pulse bg-soil-100" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-5 w-3/4 animate-pulse rounded bg-soil-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-soil-100" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-soil-100" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-soil-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
