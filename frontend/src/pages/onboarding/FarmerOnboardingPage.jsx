import { ArrowRight, Check, MapPinOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { CheckboxChips } from '../../components/form/CheckboxChips.jsx';
import { DistrictPicker } from '../../components/form/DistrictPicker.jsx';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { LocationCapture } from '../../components/form/LocationCapture.jsx';
import { PincodeListEditor } from '../../components/form/PincodeListEditor.jsx';
import { StepProgress } from '../../components/form/StepProgress.jsx';
import { TextField } from '../../components/form/TextField.jsx';
import { Screen } from '../../components/Screen.jsx';
import {
  BigButton,
  ErrorState,
  PresetChips,
  QuantityStepper,
  SkeletonList,
} from '../../components/ui/index.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';
import { isPincodeInState, isValidPincode, STATES } from '../../lib/locationRules.js';
import { LogoutLink } from './LogoutLink.jsx';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const CUTOFF_TIMES = ['12:00', '15:00', '18:00', '20:00'];
const TOTAL_STEPS = 3;

const INITIAL_FORM = {
  name: '',
  state: 'Andhra Pradesh',
  district: '',
  mandal: '',
  village: '',
  pincode: '',
  location: null,
  deliveryRadiusKm: 10,
  servicePincodes: [],
  deliveryDays: ['mon', 'wed', 'fri'],
  cutoffTime: '18:00',
  minOrderRupees: 100,
  deliveryFeeRupees: 20,
};

// Three short steps: about you, farm location (optional), how you deliver. Sensible defaults mean
// most farmers only type their name, mandal, village and pincode.
export function FarmerOnboardingPage() {
  const { t, i18n } = useTranslation(['onboarding', 'common']);
  const { client, setProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const districts = useApiRequest(
    (signal) => client.get('/locations/districts', { signal, auth: false }),
    'districts',
  );
  const districtsForState =
    districts.data?.states.find((entry) => entry.state === form.state)?.districts ?? [];

  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const inputHandler = (field) => (event) => update(field)(event.target.value);

  function validateDetails() {
    const required = t('errors.required');
    const next = {};
    if (!form.name.trim()) next.name = required;
    if (!form.district) next.district = t('errors.pickDistrict');
    if (!form.mandal.trim()) next.mandal = required;
    if (!form.village.trim()) next.village = required;
    if (!isValidPincode(form.pincode)) next.pincode = t('errors.pincode');
    else if (!isPincodeInState(form.state, form.pincode)) {
      next.pincode = t('errors.pincodeState', { state: stateName(form.state) });
    }
    return next;
  }

  function validateDelivery() {
    const next = {};
    if (form.deliveryDays.length === 0) next.deliveryDays = t('errors.pickDay');
    if (!form.location && form.servicePincodes.length === 0) {
      next.servicePincodes = t('farmer.servicePincodesRequired');
    }
    return next;
  }

  function stateName(state) {
    return state === 'Telangana' ? t('common:states.telangana') : t('common:states.andhraPradesh');
  }

  function next() {
    if (step === 1) {
      const found = validateDetails();
      setErrors(found);
      if (Object.keys(found).length > 0) return;
    }
    if (step === 2 && !form.location && form.servicePincodes.length === 0) {
      // Without a location, buyers find the farmer by pincode; start with the farm's own.
      setForm((current) => ({ ...current, servicePincodes: [current.pincode] }));
    }
    setStep((current) => current + 1);
    window.scrollTo?.(0, 0);
  }

  async function save(event) {
    event.preventDefault();
    const found = validateDelivery();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const { profile } = await client.put('/profile/farmer', {
        name: form.name.trim(),
        state: form.state,
        district: form.district,
        mandal: form.mandal.trim(),
        village: form.village.trim(),
        pincode: form.pincode,
        location: form.location && {
          latitude: form.location.latitude,
          longitude: form.location.longitude,
        },
        deliveryRadiusKm: form.deliveryRadiusKm,
        servicePincodes: form.servicePincodes,
        deliveryDays: form.deliveryDays,
        cutoffTime: form.cutoffTime,
        // The API works in paise; people think in rupees.
        minOrderValue: Math.round(form.minOrderRupees * 100),
        deliveryFee: Math.round(form.deliveryFeeRupees * 100),
      });
      // The onboarding guard now sees a profile and moves the farmer to their home.
      setProfile(profile);
    } catch (err) {
      setSaveError(
        err.code === 'VALIDATION_ERROR' || err.code === 'NETWORK_ERROR'
          ? `${t(`common:errors.${err.code}`)} ${t('errors.saveFailed')}`
          : t('errors.saveFailed'),
      );
      setSaving(false);
    }
  }

  const formatTime = (value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return new Intl.DateTimeFormat(`${i18n.language}-IN`, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(2000, 0, 1, hours, minutes));
  };

  const headings = {
    1: t('farmer.detailsHeading'),
    2: t('farmer.locationHeading'),
    3: t('farmer.deliveryHeading'),
  };

  return (
    <Screen
      title={t('farmer.title')}
      showBack={step > 1}
      onBack={() => {
        setErrors({});
        setStep((current) => current - 1);
      }}
    >
      <StepProgress current={step} total={TOTAL_STEPS} />
      <h2 className="text-2xl font-bold">{headings[step]}</h2>

      {step === 1 && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            next();
          }}
          className="flex flex-col gap-6"
        >
          <TextField
            label={t('farmer.name')}
            autoComplete="name"
            value={form.name}
            onChange={inputHandler('name')}
            error={errors.name}
          />
          <PresetChips
            label={t('farmer.state')}
            options={STATES}
            value={form.state}
            onChange={(state) => setForm((current) => ({ ...current, state, district: '' }))}
            formatOption={stateName}
          />
          {districts.loading && <SkeletonList rows={2} />}
          {districts.error && <ErrorState error={districts.error} onRetry={districts.reload} />}
          {districts.data && (
            <DistrictPicker
              label={t('farmer.district')}
              districts={districtsForState}
              value={form.district}
              onChange={update('district')}
              error={errors.district}
            />
          )}
          <TextField
            label={t('farmer.mandal')}
            value={form.mandal}
            onChange={inputHandler('mandal')}
            error={errors.mandal}
          />
          <TextField
            label={t('farmer.village')}
            value={form.village}
            onChange={inputHandler('village')}
            error={errors.village}
          />
          <TextField
            label={t('farmer.pincode')}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            value={form.pincode}
            onChange={(event) => update('pincode')(event.target.value.replace(/\D/g, ''))}
            error={errors.pincode}
          />
          <BigButton type="submit" icon={ArrowRight}>
            {t('common:actions.next')}
          </BigButton>
        </form>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <LocationCapture
            why={t('location.farmerWhy')}
            value={form.location}
            onChange={update('location')}
          />
          <BigButton
            icon={form.location ? ArrowRight : MapPinOff}
            variant={form.location ? 'primary' : 'secondary'}
            onClick={next}
          >
            {form.location ? t('common:actions.next') : t('location.skip')}
          </BigButton>
        </div>
      )}

      {step === 3 && (
        <form noValidate onSubmit={save} className="flex flex-col gap-8">
          {form.location && (
            <QuantityStepper
              label={t('farmer.radius')}
              value={form.deliveryRadiusKm}
              onChange={update('deliveryRadiusKm')}
              step={1}
              min={1}
              max={50}
              unitLabel={t('common:units.km')}
            />
          )}
          <CheckboxChips
            label={t('farmer.deliveryDays')}
            options={WEEKDAYS}
            values={form.deliveryDays}
            onChange={update('deliveryDays')}
            formatOption={(day) => t(`common:weekdays.${day}`)}
            error={errors.deliveryDays}
          />
          <PresetChips
            label={t('farmer.cutoff')}
            options={CUTOFF_TIMES}
            value={form.cutoffTime}
            onChange={update('cutoffTime')}
            formatOption={formatTime}
          />
          <QuantityStepper
            label={t('farmer.minOrder')}
            value={form.minOrderRupees}
            onChange={update('minOrderRupees')}
            step={50}
            min={0}
            max={10000}
            unitLabel="₹"
          />
          <QuantityStepper
            label={t('farmer.fee')}
            value={form.deliveryFeeRupees}
            onChange={update('deliveryFeeRupees')}
            step={5}
            min={0}
            max={500}
            unitLabel="₹"
          />
          <PincodeListEditor
            label={t('farmer.servicePincodes')}
            hint={t('farmer.servicePincodesHint')}
            values={form.servicePincodes}
            onChange={update('servicePincodes')}
            error={errors.servicePincodes}
          />
          <FormAlert message={saveError} />
          <BigButton type="submit" icon={Check} loading={saving}>
            {t('farmer.submit')}
          </BigButton>
        </form>
      )}

      <LogoutLink />
    </Screen>
  );
}
