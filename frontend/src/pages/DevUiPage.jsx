import {
  ClipboardList,
  House,
  MessageCircleQuestion,
  PackageOpen,
  Phone,
  Save,
  Trash2,
  TrendingUp,
  UserRound,
  Wheat,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from '../components/LanguagePicker.jsx';
import { Screen } from '../components/Screen.jsx';
import {
  BigButton,
  BottomNav,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  IconTile,
  PresetChips,
  QuantityStepper,
  Skeleton,
  SkeletonList,
  useToast,
} from '../components/ui/index.js';
import { ApiError } from '../lib/apiErrors.js';

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b-2 border-soil-200 pb-1 text-xl font-bold text-leaf-900">{title}</h2>
      {children}
    </section>
  );
}

// Storybook-style gallery of every reusable component (development builds only).
export function DevUiPage() {
  const { t } = useTranslation(['devui', 'common']);
  const toast = useToast();
  const [quantity, setQuantity] = useState(25);
  const [price, setPrice] = useState(30);
  const [preset, setPreset] = useState(25);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const kg = t('common:units.kg');

  return (
    <Screen title={t('title')}>
      <p className="text-lg text-ink-muted">{t('intro')}</p>
      <LanguagePicker />

      <Section title={t('sections.buttons')}>
        <BigButton icon={Save}>{t('samples.sell')}</BigButton>
        <BigButton icon={ClipboardList} variant="secondary">
          {t('samples.myOrders')}
        </BigButton>
        <BigButton icon={Trash2} variant="danger">
          {t('samples.deleteListing')}
        </BigButton>
        <BigButton icon={Save} loading>
          {t('samples.saving')}
        </BigButton>
      </Section>

      <Section title={t('sections.tiles')}>
        <div className="grid grid-cols-2 gap-3">
          <IconTile icon={Wheat} label={t('samples.sell')} onClick={() => {}} />
          <IconTile
            icon={ClipboardList}
            label={t('samples.myOrders')}
            onClick={() => {}}
            badge={3}
            badgeLabel={t('samples.badgeNew')}
          />
          <IconTile icon={TrendingUp} label={t('samples.marketPrices')} onClick={() => {}} />
          <IconTile
            icon={MessageCircleQuestion}
            label={t('samples.assistant')}
            disabled
            hint={t('common:comingSoon.title')}
          />
          <IconTile icon={Phone} label={t('samples.callAgent')} onClick={() => {}} />
        </div>
      </Section>

      <Section title={t('sections.stepper')}>
        <QuantityStepper
          label={t('samples.howMuch')}
          value={quantity}
          onChange={setQuantity}
          step={0.5}
          min={0}
          max={500}
          unitLabel={kg}
        />
        <QuantityStepper
          label={t('samples.price')}
          value={price}
          onChange={setPrice}
          step={1}
          min={1}
          unitLabel="₹"
        />
      </Section>

      <Section title={t('sections.presets')}>
        <PresetChips
          label={t('samples.howMuch')}
          options={[10, 25, 50, 100]}
          value={preset}
          onChange={setPreset}
          formatOption={(option) => `${option} ${kg}`}
        />
      </Section>

      <Section title={t('sections.feedback')}>
        <BigButton
          icon={Save}
          variant="secondary"
          onClick={() => toast.show(t('samples.toastSaved'))}
        >
          {t('samples.showToast')}
        </BigButton>
        <BigButton
          icon={Save}
          variant="secondary"
          onClick={() => toast.show(t('samples.toastError'), { tone: 'error' })}
        >
          {t('samples.showErrorToast')}
        </BigButton>
      </Section>

      <Section title={t('sections.loading')}>
        <Skeleton className="h-32 w-full" />
        <SkeletonList rows={2} />
      </Section>

      <Section title={t('sections.empty')}>
        <EmptyState
          icon={PackageOpen}
          title={t('samples.noOrdersTitle')}
          message={t('samples.noOrdersMessage')}
        />
      </Section>

      <Section title={t('sections.error')}>
        <ErrorState error={new ApiError({ status: 0, code: 'NETWORK_ERROR' })} onRetry={() => {}} />
      </Section>

      <Section title={t('sections.confirm')}>
        <BigButton icon={Trash2} variant="danger" onClick={() => setConfirmOpen(true)}>
          {t('samples.openConfirm')}
        </BigButton>
        <ConfirmSheet
          open={confirmOpen}
          tone="danger"
          confirmIcon={Trash2}
          title={t('samples.confirmTitle')}
          message={t('samples.confirmMessage')}
          confirmLabel={t('samples.confirmAction')}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            toast.show(t('samples.confirmed'));
          }}
        />
      </Section>

      <Section title={t('sections.nav')}>
        <BottomNav
          items={[
            { to: '/dev/ui', icon: House, label: t('common:nav.home'), end: true },
            { to: '/dev/ui/products', icon: Wheat, label: t('common:nav.products') },
            { to: '/dev/ui/orders', icon: ClipboardList, label: t('common:nav.orders') },
            { to: '/dev/ui/profile', icon: UserRound, label: t('common:nav.profile') },
          ]}
        />
        <div className="h-24" />
      </Section>
    </Screen>
  );
}
