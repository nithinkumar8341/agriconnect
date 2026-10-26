import { ArrowRight, CloudOff, Send, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { PriceHint } from '../../components/ai/PriceHint.jsx';
import { CropPicker } from '../../components/farmer/CropPicker.jsx';
import { PhotoStep } from '../../components/farmer/PhotoStep.jsx';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { StepProgress } from '../../components/form/StepProgress.jsx';
import { TextField } from '../../components/form/TextField.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  ErrorState,
  PresetChips,
  QuantityStepper,
  SkeletonList,
  useToast,
} from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { useCrops } from '../../hooks/useCatalog.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { usePhotoUploads } from '../../hooks/usePhotoUploads.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { formatDate, formatQuantity, formatRupees, localName } from '../../lib/format.js';
import {
  clearSellDraft,
  EMPTY_SELL_DRAFT,
  harvestDateFor,
  loadSellDraft,
  localDateString,
  saveSellDraft,
} from '../../lib/sellDraft.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TOTAL_STEPS = 3;
const MAX_PRICE_RUPEES = 10_000;
// "Very different" from the farmer's own last price for this crop: a likely typo (₹250 for ₹25).
const PRICE_WARNING_RATIO = 0.5;
const HARVEST_CHOICES = ['today', 'yesterday', 'pick'];

function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Selling in three screens (CLAUDE.md: at most 3 steps per task):
// 1. photos + crop, 2. quantity + price + harvest date, 3. check and publish.
// Choices are saved on the phone as they are made; photos are kept by usePhotoUploads.
export function SellPage() {
  const { t, i18n } = useTranslation(['farmer', 'common']);
  const language = i18n.language;
  const { client } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const online = useOnlineStatus();
  const uploads = usePhotoUploads({ client });
  const crops = useCrops();
  const myListings = useApiRequest(
    (signal) => client.get('/products/mine?limit=50', { signal }),
    'sell-recent-crops',
  );
  const [draft, setDraft] = useState(loadSellDraft);
  const [errors, setErrors] = useState({});
  const [lastPrice, setLastPrice] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const crop = crops.data?.items.find((c) => c.slug === draft.cropSlug) ?? null;
  const recentSlugs = [
    ...new Set((myListings.data?.items ?? []).map((p) => p.crop?.slug).filter(Boolean)),
  ];
  const unitLabel = draft.unit ? t(`common:units.${draft.unit}`) : '';

  const update = (changes) => setDraft((current) => ({ ...current, ...changes }));

  useEffect(() => {
    saveSellDraft(draft);
  }, [draft]);

  // The farmer's own last price for this crop: used to prefill and to catch typos.
  useEffect(() => {
    if (!draft.cropSlug) return undefined;
    let active = true;
    client
      .get(`/products/last-price?crop=${draft.cropSlug}`)
      .then(({ lastPrice: found }) => {
        if (!active) return;
        setLastPrice(found);
        if (found) {
          setDraft((current) =>
            current.priceRupees === null
              ? { ...current, priceRupees: found.pricePerUnit / 100 }
              : current,
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client, draft.cropSlug]);

  function selectCrop(selected) {
    setErrors({});
    update({
      cropSlug: selected.slug,
      unit: selected.defaultUnit,
      quantity: selected.quantityPresets[0] ?? selected.quantityStep,
      priceRupees: null,
    });
  }

  function goTo(step) {
    setErrors({});
    update({ step });
    window.scrollTo?.(0, 0);
  }

  function nextFromPhotos() {
    const found = {};
    if (uploads.photos.filter((p) => p.status !== 'failed').length === 0) {
      found.photos = t('sell.needPhoto');
    }
    if (!crop) found.crop = t('sell.needCrop');
    setErrors(found);
    if (Object.keys(found).length === 0) goTo(2);
  }

  function nextFromAmount() {
    const found = {};
    if (!(draft.quantity > 0)) found.quantity = t('onboarding:errors.required');
    if (!draft.priceRupees) {
      found.price = t('onboarding:errors.required');
    } else if (!(draft.priceRupees >= 1 && draft.priceRupees <= MAX_PRICE_RUPEES)) {
      found.price = t('sell.priceRange', {
        max: formatRupees(MAX_PRICE_RUPEES * 100, language),
      });
    }
    if (draft.harvestChoice === 'pick' && !draft.harvestDate) {
      found.harvest = t('onboarding:errors.required');
    }
    setErrors(found);
    if (Object.keys(found).length === 0) goTo(3);
  }

  function errorText(err) {
    return (
      t(`sell.errors.${err.code}`, { defaultValue: '' }) || t(`common:${errorMessageKey(err)}`)
    );
  }

  async function publish() {
    setPublishError('');
    // Without internet, or while photos are still uploading, the listing waits and is published
    // automatically as soon as both are ready (see the effect below).
    if (!navigator.onLine || !uploads.allUploaded) {
      update({ publishWhenOnline: true });
      return;
    }
    setPublishing(true);
    try {
      await client.post('/products', {
        cropSlug: draft.cropSlug,
        photoAssetIds: uploads.uploadedAssets.map((asset) => asset.id),
        quantity: draft.quantity,
        unit: draft.unit,
        pricePerUnit: Math.round(draft.priceRupees * 100),
        harvestDate: harvestDateFor(draft).toISOString(),
      });
      await uploads.clearAll();
      clearSellDraft();
      setDraft(EMPTY_SELL_DRAFT);
      toast.show(t('sell.published'));
      navigate('/farmer/products', { replace: true });
    } catch (err) {
      setPublishing(false);
      if (err.code === 'NETWORK_ERROR') {
        update({ publishWhenOnline: true });
        return;
      }
      update({ publishWhenOnline: false });
      setPublishError(errorText(err));
    }
  }

  const readyToAutoPublish =
    draft.publishWhenOnline && online && uploads.allUploaded && !publishing;
  useEffect(() => {
    if (!readyToAutoPublish) return undefined;
    // Scheduled rather than called inline: the cleanup cancels it, so React StrictMode running this
    // effect twice (and any quick re-render) can never publish the same listing twice.
    const timer = setTimeout(publish, 0);
    return () => clearTimeout(timer);
    // publish reads the latest draft and uploads; it only needs to run when readiness flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToAutoPublish]);

  function readAloud() {
    const text = t('sell.readAloudText', {
      crop: localName(crop.names, language),
      quantity: formatQuantity(draft.quantity, language),
      unit: unitLabel,
      price: formatRupees(Math.round(draft.priceRupees * 100), language),
      date: formatDate(harvestDateFor(draft), language),
    });
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = `${language}-IN`;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const headings = {
    1: t('sell.stepPhotosCrop'),
    2: t('sell.stepAmount'),
    3: t('sell.stepReview'),
  };
  const priceWarning =
    lastPrice &&
    draft.priceRupees &&
    Math.abs(draft.priceRupees * 100 - lastPrice.pricePerUnit) / lastPrice.pricePerUnit >
      PRICE_WARNING_RATIO;
  const today = new Date();

  return (
    <Screen
      title={t('sell.title')}
      onBack={draft.step > 1 ? () => goTo(draft.step - 1) : undefined}
    >
      <StepProgress current={draft.step} total={TOTAL_STEPS} />
      <h2 className="text-2xl font-bold text-leaf-900">{headings[draft.step]}</h2>

      {draft.step === 1 && (
        <>
          <PhotoStep uploads={uploads} />
          {errors.photos && <p className="font-semibold text-danger-700">{errors.photos}</p>}
          {crops.loading && <SkeletonList rows={2} />}
          {crops.error && <ErrorState error={crops.error} onRetry={crops.reload} />}
          {crops.data && (
            <CropPicker
              crops={crops.data.items}
              recentSlugs={recentSlugs}
              value={draft.cropSlug}
              onChange={selectCrop}
              error={errors.crop}
            />
          )}
          <BigButton icon={ArrowRight} onClick={nextFromPhotos}>
            {t('common:actions.next')}
          </BigButton>
        </>
      )}

      {draft.step === 2 && crop && (
        <>
          <p className="flex items-center gap-3 rounded-2xl bg-white p-3 text-xl font-bold">
            <span aria-hidden="true" className="text-4xl">
              {crop.icon}
            </span>
            {localName(crop.names, language)}
          </p>
          {crop.allowedUnits.length > 1 && (
            <PresetChips
              label={t('sell.unit')}
              options={crop.allowedUnits}
              value={draft.unit}
              onChange={(unit) => update({ unit })}
              formatOption={(unit) => t(`common:units.${unit}`)}
            />
          )}
          <PresetChips
            label={t('sell.quickPick')}
            options={crop.quantityPresets}
            value={draft.quantity}
            onChange={(quantity) => update({ quantity })}
            formatOption={(q) => `${formatQuantity(q, language)} ${unitLabel}`}
          />
          <QuantityStepper
            label={t('sell.quantity')}
            value={draft.quantity ?? 0}
            onChange={(quantity) => update({ quantity })}
            step={crop.quantityStep}
            min={crop.quantityStep}
            max={100_000}
            unitLabel={unitLabel}
          />
          {errors.quantity && <p className="font-semibold text-danger-700">{errors.quantity}</p>}

          <QuantityStepper
            label={t('sell.price', { unit: unitLabel })}
            value={draft.priceRupees ?? 0}
            onChange={(priceRupees) => update({ priceRupees })}
            step={1}
            min={1}
            max={MAX_PRICE_RUPEES}
            unitLabel="₹"
          />
          <TextField
            label={t('sell.typePrice')}
            type="text"
            inputMode="decimal"
            value={draft.priceRupees ?? ''}
            onChange={(event) => {
              const value = event.target.value.replace(/[^\d.]/g, '');
              update({ priceRupees: value === '' ? null : Number(value) });
            }}
            error={errors.price}
          />
          <PriceHint
            crop={crop.slug}
            unit={draft.unit}
            onUse={(priceRupees) => update({ priceRupees })}
          />
          {priceWarning && (
            <p role="status" className="rounded-2xl bg-sun-100 px-4 py-3 text-lg font-semibold">
              {t('sell.priceWarning', {
                price: formatRupees(lastPrice.pricePerUnit, language),
                unit: t(`common:units.${lastPrice.unit}`),
              })}
            </p>
          )}

          <PresetChips
            label={t('sell.harvest')}
            options={HARVEST_CHOICES}
            value={draft.harvestChoice}
            onChange={(harvestChoice) => update({ harvestChoice })}
            formatOption={(choice) => t(choice === 'pick' ? 'sell.pickDate' : `sell.${choice}`)}
          />
          {draft.harvestChoice === 'pick' && (
            <TextField
              label={t('sell.harvestDateLabel')}
              type="date"
              value={draft.harvestDate ?? ''}
              min={localDateString(new Date(today.getTime() - (crop.shelfLifeDays - 1) * DAY_MS))}
              max={localDateString(today)}
              onChange={(event) => update({ harvestDate: event.target.value || null })}
              error={errors.harvest}
            />
          )}
          <BigButton icon={ArrowRight} onClick={nextFromAmount}>
            {t('common:actions.next')}
          </BigButton>
        </>
      )}

      {draft.step === 3 && crop && (
        <>
          <section
            aria-label={t('sell.reviewHeading')}
            className="flex flex-col gap-3 rounded-2xl border-2 border-soil-200 bg-white p-4"
          >
            <div className="flex gap-2 overflow-x-auto">
              {uploads.photos.map((photo) =>
                photo.previewUrl ? (
                  <img
                    key={photo.id}
                    src={photo.previewUrl}
                    alt=""
                    className="size-20 shrink-0 rounded-xl object-cover"
                  />
                ) : null,
              )}
            </div>
            <p className="flex items-center gap-2 text-2xl font-bold">
              <span aria-hidden="true">{crop.icon}</span>
              {localName(crop.names, language)}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-lg">
              <div>
                <dt className="text-ink-muted">{t('sell.quantity')}</dt>
                <dd className="font-bold">
                  {formatQuantity(draft.quantity, language)} {unitLabel}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t('sell.price', { unit: unitLabel })}</dt>
                <dd className="font-bold">
                  {formatRupees(Math.round(draft.priceRupees * 100), language)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t('sell.harvestDateLabel')}</dt>
                <dd className="font-bold">{formatDate(harvestDateFor(draft), language)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t('sell.total')}</dt>
                <dd className="font-bold">
                  {formatRupees(Math.round(draft.quantity * draft.priceRupees * 100), language)}
                </dd>
              </div>
            </dl>
          </section>
          {canSpeak() && (
            <BigButton icon={Volume2} variant="secondary" onClick={readAloud}>
              {t('sell.readAloud')}
            </BigButton>
          )}
          {draft.publishWhenOnline && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-2xl bg-sun-100 px-4 py-3 text-lg"
            >
              <CloudOff aria-hidden="true" className="mt-1 size-6 shrink-0" />
              {online ? t('sell.photosPending') : t('sell.offlineQueued')}
            </p>
          )}
          <FormAlert message={publishError} />
          <BigButton
            icon={Send}
            loading={publishing}
            disabled={draft.publishWhenOnline}
            onClick={publish}
          >
            {t('sell.publish')}
          </BigButton>
        </>
      )}
    </Screen>
  );
}
