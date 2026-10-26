import { ChevronDown, MapPin, Search, SlidersHorizontal, Sprout } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { LocationSheet } from '../../components/buyer/LocationSheet.jsx';
import {
  MarketProductCard,
  ProductGridSkeleton,
} from '../../components/buyer/MarketProductCard.jsx';
import { NotificationBell } from '../../components/NotificationBell.jsx';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { TextField } from '../../components/form/TextField.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  BottomSheet,
  EmptyState,
  ErrorState,
  PresetChips,
} from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import {
  loadBuyerLocation,
  locationFromProfile,
  locationParams,
  saveBuyerLocation,
} from '../../lib/buyerLocation.js';

const PAGE_SIZE = 20;
const CATEGORIES = ['all', 'vegetable', 'fruit', 'leafy'];
const DAYS = ['any', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const NO_FILTERS = { minPrice: '', maxPrice: '', day: 'any', stock: 'in' };
const SEARCH_DELAY_MS = 350;

function searchPath(base, page) {
  const params = new URLSearchParams(base);
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
  return `/market/products?${params}`;
}

// One search's results. Remounted (new key) when the search changes, which resets loaded pages.
// More pages load automatically near the end of the list, and with "Show more" (keyboard, screen
// readers, and phones where the scroll trigger does not fire).
function ResultList({ base }) {
  const { t } = useTranslation(['buyer', 'common']);
  const { client } = useAuth();
  const first = useApiRequest((signal) => client.get(searchPath(base, 1), { signal }), base);
  const [more, setMore] = useState({ items: [], page: 1, loading: false, error: '' });
  const sentinel = useRef(null);

  const loaded = first.data ? [...first.data.items, ...more.items] : [];
  const hasMore = Boolean(first.data) && loaded.length < first.data.total;

  async function loadMore() {
    if (more.loading) return;
    setMore((current) => ({ ...current, loading: true, error: '' }));
    try {
      const next = await client.get(searchPath(base, more.page + 1));
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

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    if (!hasMore || more.error || !sentinel.current || !('IntersectionObserver' in window)) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && loadMoreRef.current(),
      { rootMargin: '400px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, more.error, more.page]);

  if (first.loading) return <ProductGridSkeleton />;
  if (first.error) return <ErrorState error={first.error} onRetry={first.reload} />;
  if (first.data.total === 0) {
    return (
      <EmptyState icon={Sprout} title={t('home.emptyTitle')} message={t('home.emptyMessage')} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-muted" aria-live="polite">
        {t('home.showing', { shown: loaded.length, total: first.data.total })}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {loaded.map((product) => (
          <li key={product.id}>
            <MarketProductCard product={product} />
          </li>
        ))}
      </ul>
      <FormAlert message={more.error} />
      {hasMore ? (
        <>
          <div ref={sentinel} aria-hidden="true" />
          <BigButton
            icon={ChevronDown}
            variant="secondary"
            loading={more.loading}
            onClick={loadMore}
          >
            {t('home.loadMore')}
          </BigButton>
        </>
      ) : (
        <p className="text-center text-ink-muted">{t('home.end')}</p>
      )}
    </div>
  );
}

function FilterSheet({ open, value, onClose, onApply }) {
  const { t } = useTranslation(['buyer', 'common']);
  const [draft, setDraft] = useState(value);
  const set = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const digits = (text) => text.replace(/\D/g, '').slice(0, 5);

  return (
    <BottomSheet open={open} onClose={onClose} title={t('filter.title')}>
      <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-2">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t('filter.minPrice')}
            inputMode="numeric"
            value={draft.minPrice}
            onChange={(event) => set({ minPrice: digits(event.target.value) })}
          />
          <TextField
            label={t('filter.maxPrice')}
            inputMode="numeric"
            value={draft.maxPrice}
            onChange={(event) => set({ maxPrice: digits(event.target.value) })}
          />
        </div>
        <PresetChips
          label={t('filter.day')}
          options={DAYS}
          value={draft.day}
          onChange={(day) => set({ day })}
          formatOption={(day) => (day === 'any' ? t('filter.anyDay') : t(`common:weekdays.${day}`))}
        />
        <PresetChips
          label={t('filter.stock')}
          options={['in', 'all']}
          value={draft.stock}
          onChange={(stock) => set({ stock })}
          formatOption={(stock) => t(stock === 'in' ? 'filter.inStock' : 'filter.all')}
        />
        <BigButton icon={SlidersHorizontal} onClick={() => onApply(draft)}>
          {t('filter.apply')}
        </BigButton>
        <BigButton variant="secondary" onClick={() => onApply(NO_FILTERS)}>
          {t('filter.clear')}
        </BigButton>
      </div>
    </BottomSheet>
  );
}

const activeFilterCount = (filters) =>
  [filters.minPrice, filters.maxPrice, filters.day !== 'any', filters.stock !== 'in'].filter(
    Boolean,
  ).length;

// Buyer home: produce from farmers who deliver to the buyer's location or pincode.
export function BuyerHomePage() {
  const { t } = useTranslation('buyer');
  const { profile } = useAuth();
  const [location, setLocation] = useState(
    () => loadBuyerLocation() ?? locationFromProfile(profile),
  );
  const [choosingLocation, setChoosingLocation] = useState(!location);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState(null);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const hasCoordinates = Number.isFinite(location?.lat);
  const sortOptions = hasCoordinates
    ? ['distance', 'price', 'rating']
    : ['freshness', 'price', 'rating'];
  const activeSort = sortOptions.includes(sort) ? sort : sortOptions[0];

  function chooseLocation(next) {
    saveBuyerLocation(next);
    setLocation(next);
    setChoosingLocation(false);
  }

  const params = locationParams(location);
  if (search) params.set('q', search);
  if (category !== 'all') params.set('category', category);
  params.set('sort', activeSort);
  if (filters.minPrice) params.set('minPrice', String(Number(filters.minPrice) * 100));
  if (filters.maxPrice) params.set('maxPrice', String(Number(filters.maxPrice) * 100));
  if (filters.day !== 'any') params.set('day', filters.day);
  if (filters.stock === 'all') params.set('inStock', 'false');
  const filterCount = activeFilterCount(filters);

  return (
    <Screen
      title={t('home.title')}
      showBack={false}
      actions={<NotificationBell to="/buyer/notifications" />}
      wide
    >
      {location && (
        <TextField
          label={t('home.search')}
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          prefix={<Search className="size-5" />}
        />
      )}
      <button
        type="button"
        onClick={() => setChoosingLocation(true)}
        className="flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-left text-lg font-semibold"
      >
        <MapPin aria-hidden="true" className="size-6 shrink-0 text-leaf-700" />
        <span className="flex-1">
          {!location && t('location.title')}
          {location &&
            (hasCoordinates
              ? t('location.near')
              : t('location.pincode', { pincode: location.pincode }))}
        </span>
        <span className="text-leaf-800 underline">{t('location.change')}</span>
      </button>

      {location ? (
        <>
          <PresetChips
            label={t('home.categoryLabel')}
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
            formatOption={(c) => t(`categories.${c}`)}
          />
          <div className="flex flex-col gap-3">
            <PresetChips
              label={t('home.sortLabel')}
              options={sortOptions}
              value={activeSort}
              onChange={setSort}
              formatOption={(s) => t(`sort.${s}`)}
            />
            <BigButton
              icon={SlidersHorizontal}
              variant="secondary"
              onClick={() => setFiltering(true)}
            >
              {filterCount ? t('home.filtersOn', { count: filterCount }) : t('home.filters')}
            </BigButton>
          </div>
          <ResultList key={params.toString()} base={params.toString()} />
        </>
      ) : (
        <EmptyState
          icon={MapPin}
          title={t('location.title')}
          message={t('location.needed')}
          action={
            <BigButton icon={MapPin} onClick={() => setChoosingLocation(true)}>
              {t('location.change')}
            </BigButton>
          }
        />
      )}

      {choosingLocation && (
        <LocationSheet
          open
          current={location}
          onClose={() => setChoosingLocation(false)}
          onChange={chooseLocation}
        />
      )}
      {filtering && (
        <FilterSheet
          open
          value={filters}
          onClose={() => setFiltering(false)}
          onApply={(next) => {
            setFilters(next);
            setFiltering(false);
          }}
        />
      )}
    </Screen>
  );
}
