import { useTranslation } from 'react-i18next';
import { formatTime } from '../../lib/format.js';
import { CheckboxChips } from '../form/CheckboxChips.jsx';
import { PincodeListEditor } from '../form/PincodeListEditor.jsx';
import { PresetChips, QuantityStepper } from '../ui/index.js';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const CUTOFF_TIMES = ['12:00', '15:00', '18:00', '20:00'];

// How the farmer delivers. The radius only makes sense with a shared location; without one,
// buyers are matched by the delivery pincodes. Used in onboarding step 3 and on the profile page.
export function DeliverySettingsFields({ form, setForm, errors }) {
  const { t, i18n } = useTranslation(['onboarding', 'common']);
  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <>
      {form.location && (
        <QuantityStepper
          label={t('farmer.radius')}
          value={form.deliveryRadiusKm}
          onChange={set('deliveryRadiusKm')}
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
        onChange={set('deliveryDays')}
        formatOption={(day) => t(`common:weekdays.${day}`)}
        error={errors.deliveryDays}
      />
      <PresetChips
        label={t('farmer.cutoff')}
        options={CUTOFF_TIMES}
        value={form.cutoffTime}
        onChange={set('cutoffTime')}
        formatOption={(time) => formatTime(time, i18n.language)}
      />
      <QuantityStepper
        label={t('farmer.minOrder')}
        value={form.minOrderRupees}
        onChange={set('minOrderRupees')}
        step={50}
        min={0}
        max={10000}
        unitLabel="₹"
      />
      <QuantityStepper
        label={t('farmer.fee')}
        value={form.deliveryFeeRupees}
        onChange={set('deliveryFeeRupees')}
        step={5}
        min={0}
        max={500}
        unitLabel="₹"
      />
      <PincodeListEditor
        label={t('farmer.servicePincodes')}
        hint={t('farmer.servicePincodesHint')}
        values={form.servicePincodes}
        onChange={set('servicePincodes')}
        error={errors.servicePincodes}
      />
    </>
  );
}
