import { ChevronDown, PackageOpen, Wheat } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { ManageListing } from '../../components/farmer/ManageListing.jsx';
import { ProductCard } from '../../components/farmer/ProductCard.jsx';
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
import { errorMessageKey } from '../../lib/apiErrors.js';

const FILTERS = ['all', 'available', 'low', 'out_of_stock', 'paused'];
const PAGE_SIZE = 20;

const productsPath = (status, page) => {
  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (status !== 'all') query.set('status', status);
  return `/products/mine?${query}`;
};

// The list for one filter. It is remounted (new key) when the filter changes, which resets the
// extra pages loaded with "Show more".
function ProductList({ status, onManage }) {
  const { t } = useTranslation(['farmer', 'common']);
  const { client } = useAuth();
  const first = useApiRequest((signal) => client.get(productsPath(status, 1), { signal }), status);
  const [more, setMore] = useState({ items: [], page: 1, loading: false, error: '' });

  async function loadMore() {
    setMore((current) => ({ ...current, loading: true, error: '' }));
    try {
      const next = await client.get(productsPath(status, more.page + 1));
      setMore((current) => ({
        items: [...current.items, ...next.items],
        page: current.page + 1,
        loading: false,
        error: '',
      }));
    } catch (err) {
      setMore((current) => ({
        ...current,
        loading: false,
        error: t(`common:${errorMessageKey(err)}`),
      }));
    }
  }

  if (first.loading) return <SkeletonList rows={3} />;
  if (first.error) return <ErrorState error={first.error} onRetry={first.reload} />;

  const { items, total } = first.data;
  const all = [...items, ...more.items];

  if (total === 0) {
    return status === 'all' ? (
      <EmptyState
        icon={Wheat}
        title={t('products.emptyTitle')}
        message={t('products.emptyMessage')}
        action={
          <BigButton icon={Wheat} to="/farmer/sell">
            {t('tiles.sell')}
          </BigButton>
        }
      />
    ) : (
      <EmptyState
        icon={PackageOpen}
        title={t('products.emptyFilteredTitle')}
        message={t('products.emptyFilteredMessage')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-muted" aria-live="polite">
        {t('products.showing', { shown: all.length, total })}
      </p>
      <ul className="flex flex-col gap-3">
        {all.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} onManage={onManage} />
          </li>
        ))}
      </ul>
      <FormAlert message={more.error} />
      {all.length < total && (
        <BigButton icon={ChevronDown} variant="secondary" loading={more.loading} onClick={loadMore}>
          {t('products.loadMore')}
        </BigButton>
      )}
    </div>
  );
}

// The farmer's listings with a status filter, each with a Manage sheet (edit, pause, resume, out of
// stock, sell again, delete). The filter lives in the URL (?status=low) so the home screen's
// "Running low" card can open it directly. After any change the list reloads.
export function MyProductsPage() {
  const { t } = useTranslation('farmer');
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('status');
  const status = FILTERS.includes(requested) ? requested : 'all';
  const [managing, setManaging] = useState(null);
  const [version, setVersion] = useState(0);

  return (
    <Screen title={t('products.title')}>
      <PresetChips
        label={t('products.filterLabel')}
        options={FILTERS}
        value={status}
        onChange={(next) =>
          setSearchParams(next === 'all' ? {} : { status: next }, { replace: true })
        }
        formatOption={(filter) => t(`products.filters.${filter}`)}
      />
      <ProductList key={`${status}:${version}`} status={status} onManage={setManaging} />
      {managing && (
        <ManageListing
          key={managing.id}
          product={managing}
          open
          onClose={() => setManaging(null)}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}
    </Screen>
  );
}
