import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { LocationCapture } from '../../components/form/LocationCapture.jsx';
import { TextField } from '../../components/form/TextField.jsx';
import { Screen } from '../../components/Screen.jsx';
import { BigButton } from '../../components/ui/BigButton.jsx';
import { isValidPincode } from '../../lib/locationRules.js';
import { LogoutLink } from './LogoutLink.jsx';

// One screen: name and a map-less address (pincode + landmark), with optional location.
export function BuyerOnboardingPage() {
  const { t } = useTranslation(['onboarding', 'common']);
  const { client, setProfile } = useAuth();
  const [form, setForm] = useState({
    name: '',
    pincode: '',
    landmark: '',
    houseAndStreet: '',
    area: '',
    location: null,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const inputHandler = (field) => (event) => update(field)(event.target.value);

  async function save(event) {
    event.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = t('errors.required');
    if (!isValidPincode(form.pincode)) found.pincode = t('errors.pincode');
    if (!form.landmark.trim()) found.landmark = t('errors.required');
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const { profile } = await client.put('/profile/buyer', {
        name: form.name.trim(),
        address: {
          label: 'Home',
          houseAndStreet: form.houseAndStreet.trim(),
          landmark: form.landmark.trim(),
          area: form.area.trim(),
          pincode: form.pincode,
          location: form.location && {
            latitude: form.location.latitude,
            longitude: form.location.longitude,
          },
        },
      });
      setProfile(profile);
    } catch (err) {
      setSaveError(
        err.code === 'NETWORK_ERROR'
          ? `${t('common:errors.NETWORK_ERROR')} ${t('errors.saveFailed')}`
          : t('errors.saveFailed'),
      );
      setSaving(false);
    }
  }

  return (
    <Screen title={t('buyer.title')} showBack={false}>
      <form noValidate onSubmit={save} className="flex flex-col gap-6">
        <TextField
          label={t('buyer.name')}
          autoComplete="name"
          value={form.name}
          onChange={inputHandler('name')}
          error={errors.name}
        />
        <TextField
          label={t('buyer.pincode')}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={form.pincode}
          onChange={(event) => update('pincode')(event.target.value.replace(/\D/g, ''))}
          error={errors.pincode}
        />
        <TextField
          label={t('buyer.landmark')}
          hint={t('buyer.landmarkHint')}
          value={form.landmark}
          onChange={inputHandler('landmark')}
          error={errors.landmark}
        />
        <TextField
          label={t('buyer.houseAndStreet')}
          autoComplete="address-line1"
          value={form.houseAndStreet}
          onChange={inputHandler('houseAndStreet')}
        />
        <TextField
          label={t('buyer.area')}
          autoComplete="address-level3"
          value={form.area}
          onChange={inputHandler('area')}
        />
        <LocationCapture
          why={t('location.buyerWhy')}
          value={form.location}
          onChange={update('location')}
        />
        <FormAlert message={saveError} />
        <BigButton type="submit" icon={Check} loading={saving}>
          {t('buyer.submit')}
        </BigButton>
      </form>
      <LogoutLink />
    </Screen>
  );
}
