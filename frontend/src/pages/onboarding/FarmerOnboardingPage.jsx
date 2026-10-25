import { ArrowRight, Check, MapPinOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { DeliverySettingsFields } from '../../components/farmer/DeliverySettingsFields.jsx';
import { FarmerDetailsFields } from '../../components/farmer/FarmerDetailsFields.jsx';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { LocationCapture } from '../../components/form/LocationCapture.jsx';
import { StepProgress } from '../../components/form/StepProgress.jsx';
import { Screen } from '../../components/Screen.jsx';
import { BigButton } from '../../components/ui/BigButton.jsx';
import {
  farmerFormToPayload,
  INITIAL_FARMER_FORM,
  saveErrorMessage,
  validateFarmerDelivery,
  validateFarmerDetails,
} from '../../lib/farmerProfileForm.js';
import { LogoutLink } from './LogoutLink.jsx';

const TOTAL_STEPS = 3;

// Three short steps: about you, farm location (optional), how you deliver. Sensible defaults mean
// most farmers only type their name, mandal, village and pincode.
export function FarmerOnboardingPage() {
  const { t } = useTranslation(['onboarding', 'common']);
  const { client, setProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FARMER_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function next() {
    if (step === 1) {
      const found = validateFarmerDetails(form, t);
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
    const found = validateFarmerDelivery(form, t);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const { profile } = await client.put('/profile/farmer', farmerFormToPayload(form));
      // The onboarding guard now sees a profile and moves the farmer to their home.
      setProfile(profile);
    } catch (err) {
      setSaveError(saveErrorMessage(t, err));
      setSaving(false);
    }
  }

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
          <FarmerDetailsFields form={form} setForm={setForm} errors={errors} />
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
            onChange={(location) => setForm((current) => ({ ...current, location }))}
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
          <DeliverySettingsFields form={form} setForm={setForm} errors={errors} />
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
