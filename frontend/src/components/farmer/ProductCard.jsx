import { CircleAlert, PackageMinus, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatQuantity, formatRupees, localName } from '../../lib/format.js';

// Status is always shown as text as well as colour, so it reads correctly for colour-blind
// people and in bright sunlight.
const STATUS_STYLES = {
  available: 'bg-leaf-100 text-leaf-900',
  out_of_stock: 'bg-soil-100 text-soil-700',
  paused: 'bg-soil-100 text-ink',
};

// One of the farmer's own listings. onManage opens the actions sheet (edit, pause, sell again...).
export function ProductCard({ product, onManage }) {
  const { t, i18n } = useTranslation(['farmer', 'common']);
  const language = i18n.language;
  const unit = t(`common:units.${product.unit}`);
  const leftPercent =
    product.quantity > 0 ? Math.round((product.availableQuantity / product.quantity) * 100) : 0;
  const cropName = localName(product.crop?.names, language);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-soil-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt=""
            loading="lazy"
            className="size-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-xl bg-leaf-50 text-4xl"
          >
            {product.crop?.icon}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-xl font-bold">{cropName}</h3>
          <p className="text-lg">
            {t('products.price', {
              price: formatRupees(product.pricePerUnit, language),
              unit,
            })}
          </p>
          {/* Under the price, not beside the name: Telugu status words are long and would squeeze
              the crop name to one letter per line on a 360px phone. */}
          <span
            className={`self-start rounded-full px-3 py-1 text-base font-semibold ${STATUS_STYLES[product.status]}`}
          >
            {t(`products.status.${product.status}`)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">
          {t('products.left', {
            left: formatQuantity(product.availableQuantity, language),
            total: formatQuantity(product.quantity, language),
            unit,
          })}
        </p>
        <div role="presentation" className="h-3 overflow-hidden rounded-full bg-soil-100">
          <div
            className={`h-full rounded-full ${product.isLowStock ? 'bg-sun-400' : 'bg-leaf-600'}`}
            style={{ width: `${leftPercent}%` }}
          />
        </div>
        <p className="text-base text-ink-muted">
          {t('products.harvested', { date: formatDate(product.harvestDate, language) })}
        </p>
      </div>

      {product.isLowStock && (
        <p className="flex items-center gap-2 rounded-xl bg-sun-100 px-3 py-2 font-semibold">
          <PackageMinus aria-hidden="true" className="size-5 shrink-0" />
          {t('products.lowBadge')}
        </p>
      )}
      {product.status === 'paused' && product.pausedReason === 'expired' ? (
        <p className="flex items-start gap-2 rounded-xl bg-danger-50 px-3 py-2 font-semibold text-danger-800">
          <CircleAlert aria-hidden="true" className="mt-1 size-5 shrink-0" />
          {t('products.pausedExpired')}
        </p>
      ) : (
        product.isPastShelfLife && (
          <p className="flex items-start gap-2 rounded-xl bg-danger-50 px-3 py-2 font-semibold text-danger-800">
            <CircleAlert aria-hidden="true" className="mt-1 size-5 shrink-0" />
            {t('products.oldWarning')}
          </p>
        )
      )}
      {onManage && (
        <button
          type="button"
          onClick={() => onManage(product)}
          aria-label={`${t('products.manage')}: ${localName(product.crop?.names, language)}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-leaf-700 font-semibold text-leaf-800 hover:bg-leaf-50"
        >
          <Settings2 aria-hidden="true" className="size-5" />
          {t('products.manage')}
        </button>
      )}
    </article>
  );
}
