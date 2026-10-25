import { useTranslation } from 'react-i18next';
import { useDistricts } from '../../hooks/useCatalog.js';
import { stateLabel } from '../../lib/farmerProfileForm.js';
import { STATES } from '../../lib/locationRules.js';
import { DistrictPicker } from '../form/DistrictPicker.jsx';
import { TextField } from '../form/TextField.jsx';
import { ErrorState, PresetChips, SkeletonList } from '../ui/index.js';

// Name and where the farm is. Used in onboarding step 1 and on the profile page.
export function FarmerDetailsFields({ form, setForm, errors }) {
  const { t } = useTranslation(['onboarding', 'common']);
  const districts = useDistricts();
  const districtsForState =
    districts.data?.states.find((entry) => entry.state === form.state)?.districts ?? [];
  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const onText = (field) => (event) => set(field)(event.target.value);

  return (
    <>
      <TextField
        label={t('farmer.name')}
        autoComplete="name"
        value={form.name}
        onChange={onText('name')}
        error={errors.name}
      />
      <PresetChips
        label={t('farmer.state')}
        options={STATES}
        value={form.state}
        // A district from the other state would be invalid, so it is cleared.
        onChange={(state) => setForm((current) => ({ ...current, state, district: '' }))}
        formatOption={(state) => stateLabel(t, state)}
      />
      {districts.loading && <SkeletonList rows={2} />}
      {districts.error && <ErrorState error={districts.error} onRetry={districts.reload} />}
      {districts.data && (
        <DistrictPicker
          label={t('farmer.district')}
          districts={districtsForState}
          value={form.district}
          onChange={set('district')}
          error={errors.district}
        />
      )}
      <TextField
        label={t('farmer.mandal')}
        value={form.mandal}
        onChange={onText('mandal')}
        error={errors.mandal}
      />
      <TextField
        label={t('farmer.village')}
        value={form.village}
        onChange={onText('village')}
        error={errors.village}
      />
      <TextField
        label={t('farmer.pincode')}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        value={form.pincode}
        onChange={(event) => set('pincode')(event.target.value.replace(/\D/g, ''))}
        error={errors.pincode}
      />
    </>
  );
}
